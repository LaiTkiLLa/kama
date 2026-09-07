import { DataSource } from 'typeorm';
import { OrderStatistics } from '../dto/get-order-statistics.dto';
import { OrdersV2 } from '../entities/orders_v2.entity';
import { Injectable } from '@nestjs/common';
import { GetOrderStatisticsArgs } from '../../ai/tools/orders/dto/get-order-statistics.schema';
import { GetOrdersStatisticsByMarketplaceArgs } from '../../ai/tools/orders/dto/get-orders-statistics-by-marketplace.schema';

@Injectable()
export class OrdersStatisticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStatistics(params: GetOrderStatisticsArgs): Promise<OrderStatistics> {
    const { dateFrom, dateTo, marketplaceTitle, warehouseTitle, warehouseType } = params;

    const query = this.dataSource
      .createQueryBuilder()
      .from(OrdersV2, 'orders')
      .leftJoin('orders.marketplace', 'marketplace')
      .leftJoin('orders.warehouse', 'warehouse')
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
    const { dateFrom, dateTo } = params;

    const result = await this.dataSource
      .createQueryBuilder()
      .from(OrdersV2, 'orders')
      .leftJoin('orders.marketplace', 'marketplace')
      .select('marketplace.title', 'marketplaceTitle')
      .addSelect('COUNT(orders.id)', 'ordersCount')
      .where('orders.marketplaceCreatedAt >= :dateFrom', { dateFrom })
      .andWhere('orders.marketplaceCreatedAt < :dateTo', { dateTo })
      .groupBy('marketplace.title')
      .orderBy('COUNT(orders.id)', 'DESC')
      .getRawMany<{
        ordersCount: string;
        marketplaceTitle: string;
      }>();

    return result.map(item => ({
      marketplaceTitle: item.marketplaceTitle,
      ordersCount: Number(item.ordersCount)
    }));
  }
}
