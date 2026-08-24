import axios from 'axios';
import { config as dotenvConfig } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import * as process from 'node:process';
import { DataSource } from 'typeorm';
import { YandexItems } from '../src/items/interfaces/yandex-items.interface';

dotenvConfig({ path: '.env' });

type CabinetTitle = 'Yandex' | 'Yandex Tamov';

type DuplicateListingRow = {
  marketplace_item_id: number;
  item_id: number;
  article: string;
  marketplace_id: number;
  marketplace_title: string;
  marketplace_identifier: string;
  stocks_count: string;
  orders_count: string;
};

type DuplicateGroup = {
  itemId: number;
  article: string;
  marketplaceId: number;
  marketplaceTitle: CabinetTitle;
  listings: DuplicateListingRow[];
};

type ListingReport = {
  marketplaceItemId: number;
  marketplaceIdentifier: string;
  stocksCount: number;
  ordersCount: number;
};

type GroupReport = {
  decision: 'SAFE' | 'REVIEW';
  reason: string;
  article: string;
  itemId: number;
  marketplace: CabinetTitle;
  currentMarketSku: string | null;
  keep: ListingReport | null;
  delete: ListingReport[];
  listings: ListingReport[];
};

const CABINETS: { title: CabinetTitle; businessIdEnv: string; tokenEnv: string }[] = [
  {
    title: 'Yandex',
    businessIdEnv: process.env.yandexBusinessId || '',
    tokenEnv: process.env.yandexToken || ''
  },
  {
    title: 'Yandex Tamov',
    businessIdEnv: process.env.yandexTamovBusinessId || '',
    tokenEnv: process.env.yandexTamovToken || ''
  }
];

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: false,
    entities: []
  });
}

async function fetchYandexOfferMappings(businessId: string, apiKey: string): Promise<Map<string, string>> {
  let pageToken: string | undefined;
  let hasMoreData = true;
  const offerIdToMarketSku = new Map<string, string>();

  while (hasMoreData) {
    let urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200`;
    if (pageToken) {
      urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200&page_token=${pageToken}`;
    }

    const { data }: { data: YandexItems } = await axios.post(
      urlItems,
      {},
      {
        headers: {
          'Api-Key': apiKey
        }
      }
    );

    for (const item of data.result.offerMappings) {
      if (!item.mapping?.marketSku || !item.offer?.offerId) {
        continue;
      }
      offerIdToMarketSku.set(item.offer.offerId, String(item.mapping.marketSku));
    }

    if (data.result.paging?.nextPageToken) {
      pageToken = data.result.paging.nextPageToken;
    } else {
      hasMoreData = false;
    }
  }

  return offerIdToMarketSku;
}

function groupDuplicates(rows: DuplicateListingRow[]): DuplicateGroup[] {
  const groups = new Map<string, DuplicateGroup>();
  for (const row of rows) {
    const key = `${row.item_id}:${row.marketplace_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.listings.push(row);
      continue;
    }
    groups.set(key, {
      itemId: row.item_id,
      article: row.article,
      marketplaceId: row.marketplace_id,
      marketplaceTitle: row.marketplace_title as CabinetTitle,
      listings: [row]
    });
  }
  return [...groups.values()];
}

function toListingReport(listing: DuplicateListingRow): ListingReport {
  return {
    marketplaceItemId: listing.marketplace_item_id,
    marketplaceIdentifier: listing.marketplace_identifier,
    stocksCount: Number(listing.stocks_count),
    ordersCount: Number(listing.orders_count)
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    const currentMarketSkuByCabinet = new Map<CabinetTitle, Map<string, string>>();

    for (const cabinet of CABINETS) {
      const businessId = process.env[cabinet.businessIdEnv];
      const apiKey = process.env[cabinet.tokenEnv];
      if (!businessId || !apiKey) {
        console.warn(`Skip ${cabinet.title}: missing ${cabinet.businessIdEnv} or ${cabinet.tokenEnv}`);
        continue;
      }
      console.log(`Fetching offer-mappings for ${cabinet.title}...`);
      const mappings = await fetchYandexOfferMappings(businessId, apiKey);
      console.log(`  ${mappings.size} offers with marketSku`);
      currentMarketSkuByCabinet.set(cabinet.title, mappings);
    }

    if (currentMarketSkuByCabinet.size === 0) {
      throw new Error('No Yandex cabinets loaded from env');
    }

    const titles = [...currentMarketSkuByCabinet.keys()];
    const duplicateRows: DuplicateListingRow[] = await dataSource.query(
      `
      SELECT
        mi.id AS marketplace_item_id,
        i.id AS item_id,
        i.article,
        mi.marketplace_id,
        m.title AS marketplace_title,
        mi.marketplace_identifier,
        (
          SELECT COUNT(*)::text
          FROM stocks s
          WHERE s.marketplace_item_id = mi.id
        ) AS stocks_count,
        (
          SELECT COUNT(*)::text
          FROM orders_v2 o
          WHERE o.marketplace_item_id = mi.id
        ) AS orders_count
      FROM marketplace_items mi
      INNER JOIN items i ON i.id = mi.item_id
      INNER JOIN marketplaces m ON m.id = mi.marketplace_id
      WHERE mi.deleted_at IS NULL
        AND m.title = ANY($1)
        AND (mi.item_id, mi.marketplace_id) IN (
          SELECT item_id, marketplace_id
          FROM marketplace_items
          WHERE deleted_at IS NULL
          GROUP BY item_id, marketplace_id
          HAVING COUNT(*) > 1
        )
      ORDER BY i.article, m.title, mi.id
      `,
      [titles]
    );

    const groups = groupDuplicates(duplicateRows);
    const idsToDelete: number[] = [];
    const report: GroupReport[] = [];
    let safeGroups = 0;
    let reviewGroups = 0;

    console.log(`\nDuplicate groups: ${groups.length}`);
    console.log(apply ? 'Mode: APPLY' : 'Mode: DRY-RUN (pass --apply to delete)');

    for (const group of groups) {
      const currentSku = currentMarketSkuByCabinet.get(group.marketplaceTitle)?.get(group.article) ?? null;
      const keep = currentSku
        ? group.listings.find(listing => listing.marketplace_identifier === currentSku)
        : undefined;
      const losers = keep
        ? group.listings.filter(listing => listing.marketplace_item_id !== keep.marketplace_item_id)
        : group.listings;
      const listings = group.listings.map(toListingReport);

      const formatListing = (listing: DuplicateListingRow): string =>
        `id=${listing.marketplace_item_id} sku=${listing.marketplace_identifier} stocks=${listing.stocks_count} orders=${listing.orders_count}`;

      if (!currentSku) {
        reviewGroups += 1;
        const reason = 'offerId нет в ответе Яндекса';
        report.push({
          decision: 'REVIEW',
          reason,
          article: group.article,
          itemId: group.itemId,
          marketplace: group.marketplaceTitle,
          currentMarketSku: null,
          keep: null,
          delete: [],
          listings
        });
        console.log(`\n[REVIEW] ${group.article} / ${group.marketplaceTitle}: ${reason}`);
        for (const listing of group.listings) {
          console.log(`  ${formatListing(listing)}`);
        }
        continue;
      }

      if (!keep) {
        reviewGroups += 1;
        const reason = `актуальный marketSku=${currentSku} нет среди дублей`;
        report.push({
          decision: 'REVIEW',
          reason,
          article: group.article,
          itemId: group.itemId,
          marketplace: group.marketplaceTitle,
          currentMarketSku: currentSku,
          keep: null,
          delete: [],
          listings
        });
        console.log(`\n[REVIEW] ${group.article} / ${group.marketplaceTitle}: ${reason}`);
        for (const listing of group.listings) {
          console.log(`  ${formatListing(listing)}`);
        }
        continue;
      }

      const unsafeLosers = losers.filter(
        listing => Number(listing.stocks_count) > 0 || Number(listing.orders_count) > 0
      );
      const safeLosers = losers.filter(
        listing => Number(listing.stocks_count) === 0 && Number(listing.orders_count) === 0
      );

      if (unsafeLosers.length > 0) {
        reviewGroups += 1;
        const reason = 'на дубле есть stocks/orders';
        report.push({
          decision: 'REVIEW',
          reason,
          article: group.article,
          itemId: group.itemId,
          marketplace: group.marketplaceTitle,
          currentMarketSku: currentSku,
          keep: toListingReport(keep),
          delete: [],
          listings
        });
        console.log(
          `\n[REVIEW] ${group.article} / ${group.marketplaceTitle}: keep id=${keep.marketplace_item_id} sku=${keep.marketplace_identifier} (актуальный), но ${reason}`
        );
        console.log(`  KEEP ${formatListing(keep)}`);
        for (const listing of losers) {
          console.log(`  LOSER ${formatListing(listing)}`);
        }
        continue;
      }

      if (safeLosers.length === 0) {
        continue;
      }

      safeGroups += 1;
      idsToDelete.push(...safeLosers.map(listing => listing.marketplace_item_id));
      report.push({
        decision: 'SAFE',
        reason: 'у дубля нет stocks и orders, keep совпадает с актуальным marketSku',
        article: group.article,
        itemId: group.itemId,
        marketplace: group.marketplaceTitle,
        currentMarketSku: currentSku,
        keep: toListingReport(keep),
        delete: safeLosers.map(toListingReport),
        listings
      });
      console.log(
        `\n[SAFE] ${group.article} / ${group.marketplaceTitle}: keep id=${keep.marketplace_item_id} sku=${currentSku}`
      );
      console.log(`  KEEP ${formatListing(keep)}`);
      for (const listing of safeLosers) {
        console.log(`  DELETE ${formatListing(listing)}`);
      }
    }

    let deletedIds: number[] = [];
    if (apply && idsToDelete.length > 0) {
      await dataSource.transaction(async manager => {
        await manager.query(`DELETE FROM marketplace_items WHERE id = ANY($1)`, [idsToDelete]);
      });
      deletedIds = idsToDelete;
      console.log(`Deleted marketplace_items: ${idsToDelete.join(', ')}`);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = 'scripts/reports';
    await mkdir(reportDir, { recursive: true });
    const reportPath = `${reportDir}/dedup-yandex-marketplace-items-${stamp}.json`;
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          mode: apply ? 'APPLY' : 'DRY-RUN',
          generatedAt: new Date().toISOString(),
          summary: {
            duplicateGroups: groups.length,
            safe: safeGroups,
            review: reviewGroups,
            deleteIds: idsToDelete.length,
            deleted: deletedIds.length
          },
          deletedMarketplaceItemIds: deletedIds,
          groups: report
        },
        null,
        2
      )
    );

    console.log(`\nSummary: safe=${safeGroups}, review=${reviewGroups}, deleteIds=${idsToDelete.length}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
