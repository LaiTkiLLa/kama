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
  decision: 'MERGE' | 'REVIEW';
  reason: string;
  article: string;
  itemId: number;
  marketplace: CabinetTitle;
  currentMarketSku: string | null;
  keep: ListingReport | null;
  delete: ListingReport[];
  listings: ListingReport[];
  stocksToReassign: number;
  stocksToDelete: number;
  ordersToReassign: number;
  ordersToDelete: number;
};

type MergePair = {
  keepMpId: number;
  duplicateMpId: number;
};

type MergePreview = {
  stocksToReassign: string;
  stocksToDelete: string;
  ordersToReassign: string;
  ordersToDelete: string;
};

const CABINETS: { title: CabinetTitle; businessIdEnv: string; tokenEnv: string }[] = [
  { title: 'Yandex', businessIdEnv: 'yandexBusinessId', tokenEnv: 'yandexToken' },
  {
    title: 'Yandex Tamov',
    businessIdEnv: 'yandexTamovBusinessId',
    tokenEnv: 'yandexTamovToken'
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

async function previewMerge(dataSource: DataSource, pairs: MergePair[]): Promise<MergePreview> {
  if (pairs.length === 0) {
    return {
      stocksToReassign: '0',
      stocksToDelete: '0',
      ordersToReassign: '0',
      ordersToDelete: '0'
    };
  }

  const rows: MergePreview[] = await dataSource.query(
    `
    WITH pairs AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(keep_mp_id int, duplicate_mp_id int)
    )
    SELECT
      (
        SELECT COUNT(*)::text
        FROM stocks s
        INNER JOIN pairs p ON p.duplicate_mp_id = s.marketplace_item_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM stocks keep_s
          WHERE keep_s.marketplace_item_id = p.keep_mp_id
            AND keep_s.warehouse_id = s.warehouse_id
            AND DATE(keep_s.created_at) = DATE(s.created_at)
        )
      ) AS "stocksToReassign",
      (
        SELECT COUNT(*)::text
        FROM stocks s
        INNER JOIN pairs p ON p.duplicate_mp_id = s.marketplace_item_id
        WHERE EXISTS (
          SELECT 1
          FROM stocks keep_s
          WHERE keep_s.marketplace_item_id = p.keep_mp_id
            AND keep_s.warehouse_id = s.warehouse_id
            AND DATE(keep_s.created_at) = DATE(s.created_at)
        )
      ) AS "stocksToDelete",
      (
        SELECT COUNT(*)::text
        FROM orders_v2 o
        INNER JOIN pairs p ON p.duplicate_mp_id = o.marketplace_item_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM orders_v2 keep_o
          WHERE keep_o.marketplace_item_id = p.keep_mp_id
            AND keep_o.marketplace_order_identification
              IS NOT DISTINCT FROM o.marketplace_order_identification
            AND keep_o.marketplace_order_posting_number
              IS NOT DISTINCT FROM o.marketplace_order_posting_number
        )
      ) AS "ordersToReassign",
      (
        SELECT COUNT(*)::text
        FROM orders_v2 o
        INNER JOIN pairs p ON p.duplicate_mp_id = o.marketplace_item_id
        WHERE EXISTS (
          SELECT 1
          FROM orders_v2 keep_o
          WHERE keep_o.marketplace_item_id = p.keep_mp_id
            AND keep_o.marketplace_order_identification
              IS NOT DISTINCT FROM o.marketplace_order_identification
            AND keep_o.marketplace_order_posting_number
              IS NOT DISTINCT FROM o.marketplace_order_posting_number
        )
      ) AS "ordersToDelete"
    `,
    [JSON.stringify(pairs.map(p => ({ keep_mp_id: p.keepMpId, duplicate_mp_id: p.duplicateMpId })))]
  );

  return rows[0];
}

async function applyMerge(dataSource: DataSource, pairs: MergePair[]): Promise<void> {
  if (pairs.length === 0) {
    return;
  }

  await dataSource.transaction(async manager => {
    await manager.query(`
      CREATE TEMP TABLE yandex_mp_dedup (
        keep_mp_id int NOT NULL,
        duplicate_mp_id int NOT NULL
      ) ON COMMIT DROP
    `);
    await manager.query(
      `
      INSERT INTO yandex_mp_dedup (keep_mp_id, duplicate_mp_id)
      SELECT keep_mp_id, duplicate_mp_id
      FROM jsonb_to_recordset($1::jsonb) AS x(keep_mp_id int, duplicate_mp_id int)
      `,
      [JSON.stringify(pairs.map(p => ({ keep_mp_id: p.keepMpId, duplicate_mp_id: p.duplicateMpId })))]
    );

    await manager.query(`
      DELETE FROM stocks dup_s
      USING yandex_mp_dedup d
      WHERE dup_s.marketplace_item_id = d.duplicate_mp_id
        AND EXISTS (
          SELECT 1
          FROM stocks keep_s
          WHERE keep_s.marketplace_item_id = d.keep_mp_id
            AND keep_s.warehouse_id = dup_s.warehouse_id
            AND DATE(keep_s.created_at) = DATE(dup_s.created_at)
        )
    `);

    await manager.query(`
      UPDATE stocks s
      SET marketplace_item_id = d.keep_mp_id, updated_at = now()
      FROM yandex_mp_dedup d
      WHERE s.marketplace_item_id = d.duplicate_mp_id
    `);

    await manager.query(`
      DELETE FROM orders_v2 dup_o
      USING yandex_mp_dedup d
      WHERE dup_o.marketplace_item_id = d.duplicate_mp_id
        AND EXISTS (
          SELECT 1
          FROM orders_v2 keep_o
          WHERE keep_o.marketplace_item_id = d.keep_mp_id
            AND keep_o.marketplace_order_identification
              IS NOT DISTINCT FROM dup_o.marketplace_order_identification
            AND keep_o.marketplace_order_posting_number
              IS NOT DISTINCT FROM dup_o.marketplace_order_posting_number
        )
    `);

    await manager.query(`
      UPDATE orders_v2 o
      SET marketplace_item_id = d.keep_mp_id, updated_at = now()
      FROM yandex_mp_dedup d
      WHERE o.marketplace_item_id = d.duplicate_mp_id
    `);

    await manager.query(`
      DELETE FROM marketplace_items mi
      USING yandex_mp_dedup d
      WHERE mi.id = d.duplicate_mp_id
    `);
  });
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
    const mergePairs: MergePair[] = [];
    const report: GroupReport[] = [];
    let mergeGroups = 0;
    let reviewGroups = 0;

    console.log(`\nDuplicate groups: ${groups.length}`);
    console.log(apply ? 'Mode: APPLY' : 'Mode: DRY-RUN (pass --apply to merge/delete)');

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
          listings,
          stocksToReassign: 0,
          stocksToDelete: 0,
          ordersToReassign: 0,
          ordersToDelete: 0
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
          listings,
          stocksToReassign: 0,
          stocksToDelete: 0,
          ordersToReassign: 0,
          ordersToDelete: 0
        });
        console.log(`\n[REVIEW] ${group.article} / ${group.marketplaceTitle}: ${reason}`);
        for (const listing of group.listings) {
          console.log(`  ${formatListing(listing)}`);
        }
        continue;
      }

      const pairs = losers.map(loser => ({
        keepMpId: keep.marketplace_item_id,
        duplicateMpId: loser.marketplace_item_id
      }));
      const preview = await previewMerge(dataSource, pairs);
      mergeGroups += 1;
      mergePairs.push(...pairs);
      report.push({
        decision: 'MERGE',
        reason:
          'keep = актуальный marketSku; stocks без конфликта склада+дня и заказы без того же id переносятся, конфликты удаляются, loser listing удаляется',
        article: group.article,
        itemId: group.itemId,
        marketplace: group.marketplaceTitle,
        currentMarketSku: currentSku,
        keep: toListingReport(keep),
        delete: losers.map(toListingReport),
        listings,
        stocksToReassign: Number(preview.stocksToReassign),
        stocksToDelete: Number(preview.stocksToDelete),
        ordersToReassign: Number(preview.ordersToReassign),
        ordersToDelete: Number(preview.ordersToDelete)
      });
      console.log(
        `\n[MERGE] ${group.article} / ${group.marketplaceTitle}: keep id=${keep.marketplace_item_id} sku=${currentSku}`
      );
      console.log(`  KEEP ${formatListing(keep)}`);
      for (const listing of losers) {
        console.log(`  DELETE listing ${formatListing(listing)}`);
      }
      console.log(
        `  stocks reassign=${preview.stocksToReassign} delete=${preview.stocksToDelete}; orders reassign=${preview.ordersToReassign} delete=${preview.ordersToDelete}`
      );
    }

    let deletedIds: number[] = [];
    if (apply) {
      await applyMerge(dataSource, mergePairs);
      deletedIds = mergePairs.map(pair => pair.duplicateMpId);
      console.log(`Merged pairs: ${mergePairs.length}; deleted marketplace_items: ${deletedIds.join(', ')}`);
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
            merge: mergeGroups,
            review: reviewGroups,
            deleteIds: mergePairs.length,
            deleted: deletedIds.length,
            stocksToReassign: report.reduce((sum, g) => sum + g.stocksToReassign, 0),
            stocksToDelete: report.reduce((sum, g) => sum + g.stocksToDelete, 0),
            ordersToReassign: report.reduce((sum, g) => sum + g.ordersToReassign, 0),
            ordersToDelete: report.reduce((sum, g) => sum + g.ordersToDelete, 0)
          },
          deletedMarketplaceItemIds: deletedIds,
          groups: report
        },
        null,
        2
      )
    );

    console.log(`\nSummary: merge=${mergeGroups}, review=${reviewGroups}, deleteIds=${mergePairs.length}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
