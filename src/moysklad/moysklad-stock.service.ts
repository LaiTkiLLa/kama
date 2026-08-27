import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, IsNull } from 'typeorm';
import { Items } from '../items/entities/items.entity';
import { MarketplaceItems } from '../items/entities/marketplace-items.entity';
import { MoyskladItemLinks } from './entities/moysklad-item-links.entity';
import { MoyskladWarehouseMappings } from './entities/moysklad-warehouse-mappings.entity';
import { MoySkladClient } from './moysklad.client';
import {
  FBS_STOCK_PUBLISHERS,
  FbsStockPublisher,
  FbsStockPushItem
} from './publishers/fbs-stock-publisher.interface';

@Injectable()
export class MoyskladStockService {
  private readonly logger = new Logger(MoyskladStockService.name);

  constructor(
    private dataSource: DataSource,
    private moyskladClient: MoySkladClient,
    @Inject(FBS_STOCK_PUBLISHERS)
    private publishers: FbsStockPublisher[]
  ) {}

  // @Cron('0 */7 * * * *')
  async syncStocksToMarketplaces() {
    if (!this.moyskladClient.isConfigured()) {
      return;
    }

    const mappings = await this.dataSource.manager.find(MoyskladWarehouseMappings, {
      relations: { warehouse: { marketplace: true } }
    });
    if (!mappings.length) {
      return;
    }

    for (const mapping of mappings) {
      try {
        await this.syncMapping(mapping);
      } catch (error) {
        this.logger.error(error);
        this.logger.error(`Не смог синхронизировать остатки МС → МП для store=${mapping.moyskladStoreId}`);
      }
    }
  }

  async syncMapping(mapping: MoyskladWarehouseMappings): Promise<void> {
    const warehouse = mapping.warehouse;
    if (!warehouse?.marketplace || warehouse.deletedAt) {
      this.logger.error(`Mapping ${mapping.id}: склад не загружен или удалён`);
      return;
    }
    if (warehouse.type !== 'FBS') {
      this.logger.warn(`Mapping ${mapping.id}: склад type=${warehouse.type}, ожидался FBS — skip`);
      return;
    }

    const publisher = this.publishers.find(p => p.marketplaceTitle === warehouse.marketplace.title);
    if (!publisher) {
      this.logger.warn(
        `Нет publisher для marketplace=${warehouse.marketplace.title} (mapping ${mapping.id})`
      );
      return;
    }

    const stockRows = await this.moyskladClient.getStockAllByStore(mapping.moyskladStoreId);
    const pushItems: FbsStockPushItem[] = [];

    for (const row of stockRows) {
      const articleKey = (row.article?.trim() || row.code?.trim() || '').trim();
      if (!articleKey) {
        continue;
      }

      const assortmentHref = this.moyskladClient.assortmentHrefFromMeta(row.meta.href);
      const assortmentId = this.moyskladClient.assortmentIdFromHref(assortmentHref);
      if (!assortmentId) {
        this.logger.warn(`Не разобрал assortment id из ${row.meta.href}`);
        continue;
      }

      const item = await this.dataSource.manager.findOne(Items, {
        where: { article: articleKey, createdForCalculation: false }
      });
      if (!item) {
        continue;
      }

      await this.upsertItemLink(item.id, assortmentId, assortmentHref);

      const mpItem = await this.dataSource.manager.findOne(MarketplaceItems, {
        where: {
          itemId: item.id,
          marketplaceId: warehouse.marketplaceId,
          deletedAt: IsNull()
        }
      });
      if (!mpItem) {
        continue;
      }

      const sku = this.resolveSku(publisher.marketplaceTitle, mpItem, item);
      if (!sku) {
        continue;
      }

      const amount = Math.max(0, Math.floor(Number(row.quantity) || 0));
      pushItems.push({ sku, amount });
    }

    if (!warehouse.marketplaceInternalNumber) {
      this.logger.error(`Склад ${warehouse.id} без marketplaceInternalNumber`);
      return;
    }

    await publisher.push(warehouse.marketplaceInternalNumber, pushItems);
    this.logger.log(
      `МС → ${publisher.marketplaceTitle} warehouse=${warehouse.title}: запушено ${pushItems.length} SKU`
    );
  }

  private resolveSku(marketplaceTitle: string, mpItem: MarketplaceItems, item: Items): string | null {
    if (marketplaceTitle === 'WB') {
      return mpItem.barcode || null;
    }
    // Ozon later: offer_id = article
    return item.article || null;
  }

  private async upsertItemLink(itemId: number, assortmentId: string, assortmentHref: string): Promise<void> {
    const existing = await this.dataSource.manager.findOne(MoyskladItemLinks, {
      where: { itemId }
    });
    if (!existing) {
      await this.dataSource.manager.save(
        MoyskladItemLinks,
        this.dataSource.manager.create(MoyskladItemLinks, {
          itemId,
          assortmentId,
          assortmentHref
        })
      );
      return;
    }
    if (existing.assortmentId !== assortmentId || existing.assortmentHref !== assortmentHref) {
      await this.dataSource.manager.update(MoyskladItemLinks, existing.id, {
        assortmentId,
        assortmentHref
      });
    }
  }
}
