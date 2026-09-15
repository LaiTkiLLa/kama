import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MarketplaceItems } from '../../items/entities/marketplace-items.entity';
import { GetCurrentStocksArgs } from '../../ai/tools/stocks/dto/get-current-stocks.schema';

type WarehouseStock = { title: string; value: number };

type MarketplaceStocksAggregate = {
  marketplaceTitle: string;
  listingsCount: number;
  quantityFull: number;
  inWayToClient: number;
  inWayFromClient: number;
  fbsWarehouses: WarehouseStock[];
  fboWarehouses: WarehouseStock[];
};

type CurrentStocksAggregate = {
  listingsCount: number;
  quantityFull: number;
  inWayToClient: number;
  inWayFromClient: number;
  byMarketplace: MarketplaceStocksAggregate[];
};

@Injectable()
export class StocksStatisticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getCurrentStocks(getCurrentStocksDto: GetCurrentStocksArgs): Promise<CurrentStocksAggregate> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const { marketplaceTitle, article, warehouseType, warehouseTitle } = getCurrentStocksDto;

      const queryBuilder = queryRunner.manager
        .createQueryBuilder(MarketplaceItems, 'mpItems')
        .leftJoinAndSelect('mpItems.marketplace', 'marketplace')
        .leftJoinAndSelect('mpItems.item', 'item')
        .leftJoinAndSelect(
          'mpItems.stocks',
          'stocks',
          `
        stocks.created_at >= CURRENT_DATE
        AND stocks.created_at < CURRENT_DATE + INTERVAL '1 day'
      `
        )
        .leftJoinAndSelect('stocks.warehouse', 'warehouse')
        .where('mpItems.deletedAt IS NULL')
        .andWhere('item.createdForCalculation = :createdForCalculation', {
          createdForCalculation: false
        });

      if (marketplaceTitle !== undefined) {
        queryBuilder.andWhere('marketplace.title = :marketplaceTitle', {
          marketplaceTitle
        });
      }

      if (article !== undefined) {
        queryBuilder.andWhere('item.article = :article', {
          article
        });
      }

      if (warehouseType !== undefined) {
        queryBuilder.andWhere('warehouse.type = :warehouseType', {
          warehouseType
        });
      }

      if (warehouseTitle !== undefined) {
        queryBuilder.andWhere('warehouse.title = :warehouseTitle', {
          warehouseTitle
        });
      }

      const findItemsWithStocks = await queryBuilder.getMany();

      const excludeWarehouses = [
        18, 1146895, 16, 59, 95, 1146938, 1146932, 1146912, 19, 1147083, 1146906, 242582, 158, 1146879, 67,
        1146902, 1146903, 1146878, 1146919, 1147137, 1147160, 1146898, 1147058, 21, 1146887, 1146888, 1146889,
        383378, 80330, 1146880, 1146881, 22, 1146893, 1146031, 1149375, 43, 12, 14, 331714, 335470, 1147284,
        1147304, 1147356, 1147357, 35, 1147313, 1150862
      ];

      const byMarketplaceMap = new Map<
        string,
        {
          listingsCount: number;
          quantityFull: number;
          inWayToClient: number;
          inWayFromClient: number;
          fbsWarehouses: Map<string, number>;
          fboWarehouses: Map<string, number>;
        }
      >();

      for (const mpItem of findItemsWithStocks) {
        const mpTitle = mpItem.marketplace.title;
        let bucket = byMarketplaceMap.get(mpTitle);
        if (!bucket) {
          bucket = {
            listingsCount: 0,
            quantityFull: 0,
            inWayToClient: 0,
            inWayFromClient: 0,
            fbsWarehouses: new Map(),
            fboWarehouses: new Map()
          };
          byMarketplaceMap.set(mpTitle, bucket);
        }

        bucket.listingsCount += 1;

        for (const stock of mpItem.stocks) {
          if (excludeWarehouses.includes(stock.warehouseId)) {
            continue;
          }

          const currentValue = stock.currentValue ?? 0;
          bucket.quantityFull += currentValue;
          bucket.inWayToClient += stock.reserved ?? 0;
          bucket.inWayFromClient += stock.promised ?? 0;

          if (stock.warehouse.type === 'FBS') {
            bucket.fbsWarehouses.set(
              stock.warehouse.title,
              (bucket.fbsWarehouses.get(stock.warehouse.title) ?? 0) + currentValue
            );
          }

          if (stock.warehouse.type === 'FBO') {
            bucket.fboWarehouses.set(
              stock.warehouse.title,
              (bucket.fboWarehouses.get(stock.warehouse.title) ?? 0) + currentValue
            );
          }
        }
      }

      const byMarketplace: MarketplaceStocksAggregate[] = Array.from(byMarketplaceMap.entries()).map(
        ([mpTitle, bucket]) => ({
          marketplaceTitle: mpTitle,
          listingsCount: bucket.listingsCount,
          quantityFull: bucket.quantityFull,
          inWayToClient: bucket.inWayToClient,
          inWayFromClient: bucket.inWayFromClient,
          fbsWarehouses: this.mapToWarehouseList(bucket.fbsWarehouses),
          fboWarehouses: this.mapToWarehouseList(bucket.fboWarehouses)
        })
      );

      return {
        listingsCount: byMarketplace.reduce((sum, row) => sum + row.listingsCount, 0),
        quantityFull: byMarketplace.reduce((sum, row) => sum + row.quantityFull, 0),
        inWayToClient: byMarketplace.reduce((sum, row) => sum + row.inWayToClient, 0),
        inWayFromClient: byMarketplace.reduce((sum, row) => sum + row.inWayFromClient, 0),
        byMarketplace
      };
    } finally {
      await queryRunner.release();
    }
  }

  private mapToWarehouseList(warehouses: Map<string, number>): WarehouseStock[] {
    return Array.from(warehouses.entries())
      .map(([title, value]) => ({ title, value }))
      .sort((a, b) => b.value - a.value);
  }
}
