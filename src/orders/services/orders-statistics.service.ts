import { DataSource } from 'typeorm';
import { OrderStatistics } from '../dto/get-order-statistics.dto';
import { OrdersV2 } from '../entities/orders_v2.entity';
import { Injectable } from '@nestjs/common';
import { GetOrderStatisticsArgs } from '../../ai/tools/orders/dto/get-order-statistics.schema';
import { GetOrdersStatisticsByMarketplaceArgs } from '../../ai/tools/orders/dto/get-orders-statistics-by-marketplace.schema';
import { CompareOrderPeriodsArgs } from '../../ai/tools/orders/dto/compare-order-periods.schema';

@Injectable()
export class OrdersStatisticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStatistics(params: GetOrderStatisticsArgs): Promise<OrderStatistics> {
    const { dateFrom, dateTo, marketplaceTitle, warehouseTitle, warehouseType, article } = params;

    const query = this.dataSource
      .createQueryBuilder()
      .from(OrdersV2, 'orders')
      .leftJoin('orders.marketplace', 'marketplace')
      .leftJoin('orders.warehouse', 'warehouse')
      .leftJoin('orders.marketplaceItem', 'marketplaceItem')
      .leftJoin('marketplaceItem.item', 'item')
      .select('COUNT(orders.id)', 'ordersCount')
      .addSelect('COALESCE(SUM(orders.quantity), 0)', 'totalQuantity')
      .addSelect('COALESCE(SUM(orders.price), 0)', 'totalPrice')
      .addSelect('COALESCE(SUM(orders.payout), 0)', 'totalPayout')
      .where('orders.marketplaceCreatedAt >= :dateFrom', { dateFrom })
      .andWhere('orders.marketplaceCreatedAt < :dateTo', { dateTo });

    if (marketplaceTitle !== undefined) {
      query.andWhere('marketplace.title = :marketplaceTitle', { marketplaceTitle });
    }

    if (warehouseTitle !== undefined) {
      query.andWhere('warehouse.title = :warehouseTitle', { warehouseTitle });
    }

    if (warehouseType) {
      query.andWhere('warehouse.type = :warehouseType', { warehouseType });
    }

    if (article !== undefined) {
      query.andWhere('item.article = :article', {
        article
      });
    }

    const result = await query.getRawOne<{
      ordersCount: string;
      totalQuantity: string;
      totalPrice: string;
      totalPayout: string;
    }>();

    if (!result) {
      throw new Error('Не смог получить статистику');
    }

    return {
      ordersCount: Number(result.ordersCount),
      totalQuantity: Number(result.totalQuantity),
      totalPrice: Number(result.totalPrice),
      totalPayout: Number(result.totalPayout)
    };
  }

  async getStatisticsByMarketplace(params: GetOrdersStatisticsByMarketplaceArgs) {
    const { dateFrom, dateTo, article } = params;

    const query = this.dataSource
      .createQueryBuilder()
      .from(OrdersV2, 'orders')
      .leftJoin('orders.marketplace', 'marketplace')
      .leftJoin('orders.marketplaceItem', 'marketplaceItem')
      .leftJoin('marketplaceItem.item', 'item')
      .select('marketplace.title', 'marketplaceTitle')
      .addSelect('COUNT(orders.id)', 'ordersCount')
      .where('orders.marketplaceCreatedAt >= :dateFrom', { dateFrom })
      .andWhere('orders.marketplaceCreatedAt < :dateTo', { dateTo })
      .groupBy('marketplace.title')
      .orderBy('COUNT(orders.id)', 'DESC');

    if (article !== undefined) {
      query.andWhere('item.article = :article', {
        article
      });
    }

    const result = await query.getRawMany<{
      ordersCount: string;
      marketplaceTitle: string;
    }>();

    return result.map(item => ({
      marketplaceTitle: item.marketplaceTitle,
      ordersCount: Number(item.ordersCount)
    }));
  }

  async comparePeriods(params: CompareOrderPeriodsArgs): Promise<{
    period1: OrderStatistics;
    period2: OrderStatistics;
  }> {
    const {
      period1DateFrom,
      period1DateTo,
      period2DateFrom,
      period2DateTo,
      marketplaceTitle,
      warehouseTitle,
      warehouseType,
      article
    } = params;

    const query = this.dataSource
      .createQueryBuilder(OrdersV2, 'orders')
      .leftJoin('orders.marketplace', 'marketplace')
      .leftJoin('orders.warehouse', 'warehouse')
      .leftJoin('orders.marketplaceItem', 'marketplaceItem')
      .leftJoin('marketplaceItem.item', 'item')
      .select(
        `
      COUNT(
        CASE
          WHEN orders.marketplaceCreatedAt >= :period1DateFrom
           AND orders.marketplaceCreatedAt < :period1DateTo
          THEN orders.id
        END
      )
      `,
        'period1OrdersCount'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period1DateFrom
             AND orders.marketplaceCreatedAt < :period1DateTo
            THEN orders.quantity
            ELSE 0
          END
        ),
        0
      )
      `,
        'period1TotalQuantity'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period1DateFrom
             AND orders.marketplaceCreatedAt < :period1DateTo
            THEN orders.price
            ELSE 0
          END
        ),
        0
      )
      `,
        'period1TotalPrice'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period1DateFrom
             AND orders.marketplaceCreatedAt < :period1DateTo
            THEN orders.payout
            ELSE 0
          END
        ),
        0
      )
      `,
        'period1TotalPayout'
      )
      .addSelect(
        `
      COUNT(
        CASE
          WHEN orders.marketplaceCreatedAt >= :period2DateFrom
           AND orders.marketplaceCreatedAt < :period2DateTo
          THEN orders.id
        END
      )
      `,
        'period2OrdersCount'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period2DateFrom
             AND orders.marketplaceCreatedAt < :period2DateTo
            THEN orders.quantity
            ELSE 0
          END
        ),
        0
      )
      `,
        'period2TotalQuantity'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period2DateFrom
             AND orders.marketplaceCreatedAt < :period2DateTo
            THEN orders.price
            ELSE 0
          END
        ),
        0
      )
      `,
        'period2TotalPrice'
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN orders.marketplaceCreatedAt >= :period2DateFrom
             AND orders.marketplaceCreatedAt < :period2DateTo
            THEN orders.payout
            ELSE 0
          END
        ),
        0
      )
      `,
        'period2TotalPayout'
      )
      .where(
        `
      (
        orders.marketplaceCreatedAt >= :period1DateFrom
        AND orders.marketplaceCreatedAt < :period1DateTo
      )
      OR
      (
        orders.marketplaceCreatedAt >= :period2DateFrom
        AND orders.marketplaceCreatedAt < :period2DateTo
      )
      `
      )
      .setParameters({
        period1DateFrom,
        period1DateTo,
        period2DateFrom,
        period2DateTo
      });

    if (marketplaceTitle !== undefined) {
      query.andWhere('marketplace.title = :marketplaceTitle', {
        marketplaceTitle
      });
    }

    if (warehouseTitle !== undefined) {
      query.andWhere('warehouse.title = :warehouseTitle', {
        warehouseTitle
      });
    }

    if (warehouseType) {
      query.andWhere('warehouse.type = :warehouseType', {
        warehouseType
      });
    }

    if (article !== undefined) {
      query.andWhere('item.article = :article', {
        article
      });
    }

    const result = await query.getRawOne<{
      period1OrdersCount: string;
      period1TotalQuantity: string;
      period1TotalPrice: string;
      period1TotalPayout: string;
      period2OrdersCount: string;
      period2TotalQuantity: string;
      period2TotalPrice: string;
      period2TotalPayout: string;
    }>();

    if (!result) {
      throw new Error('Не смог получить статистику для сравнения периодов');
    }

    return {
      period1: {
        ordersCount: Number(result.period1OrdersCount),
        totalQuantity: Number(result.period1TotalQuantity),
        totalPrice: Number(result.period1TotalPrice),
        totalPayout: Number(result.period1TotalPayout)
      },
      period2: {
        ordersCount: Number(result.period2OrdersCount),
        totalQuantity: Number(result.period2TotalQuantity),
        totalPrice: Number(result.period2TotalPrice),
        totalPayout: Number(result.period2TotalPayout)
      }
    };
  }
}
