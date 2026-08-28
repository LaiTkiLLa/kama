import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetOrdersOzonV2, GetOrdersResult } from './interfaces/get-orders-ozon.interface';
import { ItemsService } from '../items/items.service';
import { InfoService } from '../info/info.service';
import { GetOrdersWb } from './interfaces/get-orders-wb.interface';
import {
  GetOrdersYandex,
  GetOrdersYandexV2,
  YandexOrderInfoV2
} from './interfaces/get-orders-yandex.interface';
import { Items } from '../items/entities/items.entity';
import { GetDynamicOrdersDto } from './dto/get-dynamic-orders.dto';
import { StocksService } from '../stocks/stocks.service';
import { GetDynamicOrders } from './interfaces/get-dynamic-orders.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Warehouses } from '../info/entities/warehouses.entity';
import { OrdersV2 } from './entities/orders_v2.entity';
import { MarketplaceItems } from '../items/entities/marketplace-items.entity';

interface ItemOrdersStats {
  marketplace_item_id: string;
  total_orders_period: string; //кол-во заказов за весь 90 дневный период
  avg_orders_day: string; //среднее кол-во заказов за 90 дней округленное вверх
  total_orders_above_avg: string; //кол-во заказов, которых больше чем avg_orders_day
  days_above_avg: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
    private itemsService: ItemsService,
    private infoService: InfoService,
    private stocksService: StocksService
  ) {}

  private logger: Logger = new Logger(OrdersService.name);

  async getDynamicOrders(getDynamicOrdersDto: GetDynamicOrdersDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const result: GetDynamicOrders[] = [];
      //Получаем значения со склада
      const responseStocks = await this.stocksService.getStocks(
        {
          marketplace: getDynamicOrdersDto.marketplace,
          warehouseType: getDynamicOrdersDto.warehouseType,
          suppliers: getDynamicOrdersDto?.suppliers?.length ? getDynamicOrdersDto.suppliers : undefined
        },
        queryRunner
      );

      for (const item of responseStocks) {
        result.push({
          supplierArticle: item.supplierArticle,
          sku: Number(item.sku),
          itemId: item.id,
          marketplaceItemId: item.mpItem,
          barcode: String(item.barcode),
          orders: 0,
          reserved: item.inWayToClient,
          promiseAmount: item.inWayFromClient,
          quantityFull: item.quantityFull,
          ordersSum: 0,
          ordersLastNinetyDays: 0,
          ordersLastThirtyDays: 0,
          ordersLastSixtyDays: 0,
          ordersLastWeek: 0,
          reserve: 0,
          speedSales: 0,
          ordersLastFifteenDays: 0,
          ordersLastFourteenDays: 0,
          ordersLastTwentyOneDays: 0,
          ordersThirdDays: 0,
          totalOrdersAboveAvg: 0,
          daysAboveAvg: 0,
          speedSalesAboveAvg: 0,
          wbOwnWarehouses: item.wbOwnWarehouses
        });
      }

      if (getDynamicOrdersDto.marketplace === 'Озон') {
        const ordersResult = await this.getOrders(getDynamicOrdersDto.days, 'Озон', result);
        return await this.getOrdersV2(queryRunner, 'Озон', ordersResult);
      } else if (getDynamicOrdersDto.marketplace === 'Ozon Tamov') {
        const ordersResult = await this.getOrders(getDynamicOrdersDto.days, 'Ozon Tamov', result);
        return await this.getOrdersV2(queryRunner, 'Ozon Tamov', ordersResult);
      } else if (getDynamicOrdersDto.marketplace === 'WB') {
        const ordersResult = await this.getOrders(getDynamicOrdersDto.days, 'WB', result);
        return await this.getOrdersV2(queryRunner, 'WB', ordersResult);
      } else if (getDynamicOrdersDto.marketplace === 'Yandex') {
        const ordersResult = await this.getOrders(getDynamicOrdersDto.days, 'Yandex', result);
        return await this.getOrdersV2(queryRunner, 'Yandex', ordersResult);
      } else if (getDynamicOrdersDto.marketplace === 'Yandex Tamov') {
        const ordersResult = await this.getOrders(getDynamicOrdersDto.days, 'Yandex Tamov', result);
        return await this.getOrdersV2(queryRunner, 'Yandex Tamov', ordersResult);
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить остатки и заказы');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrders(
    days: number,
    marketplaceTitle: 'Озон' | 'Ozon Tamov' | 'WB' | 'Yandex Tamov' | 'Yandex',
    result: GetDynamicOrders[]
  ) {
    const prevDate = this.daysAgo(days);
    const prevThirdDays = this.daysAgo(3);
    const prevNinetyDays = this.daysAgo(90);
    const prevSixtyDays = this.daysAgo(60);
    const prevThirtyDays = this.daysAgo(30);
    const prevFifteenDays = this.daysAgo(15);
    const prevTwentyOneDays = this.daysAgo(21);
    const prevFourteenDays = this.daysAgo(14);
    const lastWeek = this.daysAgo(7);

    const orders = await this.dataSource.manager
      .createQueryBuilder(OrdersV2, 'orders')
      .leftJoinAndSelect('orders.marketplace', 'marketplace')
      .where('orders.marketplaceCreatedAt >= :prevNinetyDays', {
        prevNinetyDays
      })
      .andWhere('marketplace.title = :marketplaceTitle', { marketplaceTitle })
      .getMany();
    for (const order of orders) {
      const findItem = result.find(item => item.marketplaceItemId === order.marketplaceItemId);
      if (!findItem) {
        continue;
      }
      const orderDate = new Date(order.marketplaceCreatedAt);
      findItem.ordersLastNinetyDays += order.quantity;
      if (orderDate >= prevThirtyDays) {
        findItem.ordersLastThirtyDays += order.quantity;
      }
      if (orderDate >= prevThirdDays) {
        findItem.ordersThirdDays += order.quantity;
      }
      if (orderDate >= prevFifteenDays) {
        findItem.ordersLastFifteenDays += order.quantity;
      }
      if (orderDate >= prevFourteenDays) {
        findItem.ordersLastFourteenDays += order.quantity;
      }
      if (orderDate >= prevTwentyOneDays) {
        findItem.ordersLastTwentyOneDays += order.quantity;
      }
      if (orderDate >= prevSixtyDays) {
        findItem.ordersLastSixtyDays += order.quantity;
      }
      if (orderDate >= lastWeek) {
        findItem.ordersLastWeek += order.quantity;
      }
      if (orderDate >= prevDate) {
        findItem.orders += order.quantity;
        findItem.ordersSum += Number(order.price);
      }
    }
    for (const item of result) {
      const speedSales = item.orders / days;
      item.speedSales = speedSales;
      let reserve = 0;
      if (speedSales) {
        reserve = item.quantityFull / speedSales;
      }
      item.reserve = reserve;
    }
    return result;
  }

  async getOrdersV2(
    queryRunner: QueryRunner,
    marketplaceTitle: 'Озон' | 'Ozon Tamov' | 'WB' | 'Yandex' | 'Yandex Tamov',
    result: GetDynamicOrders[]
  ): Promise<GetDynamicOrders[]> {
    const ordersResult = (await queryRunner.query(
      `
        WITH date_series AS (
          SELECT generate_series(
                   date_trunc('day', now() - INTERVAL '90 days'),
                   date_trunc('day', now()),
                   INTERVAL '1 day'
                 )::date AS order_day
        ),
             mp_list AS (
               SELECT DISTINCT orders_v2.marketplace_item_id
               FROM orders_v2
                      LEFT JOIN public.marketplaces m ON orders_v2.marketplace_id = m.id
               WHERE orders_v2.marketplace_created_at >= now() - INTERVAL '90 days'
          AND m.title = $1
          ),
          mp_days AS (
        SELECT marketplace_item_id, order_day
        FROM mp_list
          CROSS JOIN date_series
          ),
          daily_counts AS (
        SELECT
          orders_v2.marketplace_item_id,
          date_trunc('day', orders_v2.marketplace_created_at)::date AS order_day,
          count(*) AS orders_count
        FROM orders_v2
          LEFT JOIN public.marketplaces m ON orders_v2.marketplace_id = m.id
        WHERE orders_v2.marketplace_created_at >= now() - INTERVAL '90 days'
          AND m.title = $1
        GROUP BY orders_v2.marketplace_item_id, date_trunc('day', orders_v2.marketplace_created_at)::date
          ),
          full_counts AS (
        SELECT
          md.marketplace_item_id,
          md.order_day,
          coalesce(dc.orders_count, 0) AS orders_count
        FROM mp_days md
          LEFT JOIN daily_counts dc
        ON dc.marketplace_item_id = md.marketplace_item_id
          AND dc.order_day = md.order_day
          ),
          with_totals AS (
        SELECT
          marketplace_item_id,
          order_day,
          orders_count,
          sum(orders_count) OVER (PARTITION BY marketplace_item_id) AS total_orders_period
        FROM full_counts
          ),
          with_avg AS (
        SELECT
          marketplace_item_id,
          order_day,
          orders_count,
          total_orders_period,
          floor(total_orders_period / 90.0) AS avg_orders_day
        FROM with_totals
          )
        SELECT
          marketplace_item_id,
          max(total_orders_period) AS total_orders_period,
          max(avg_orders_day)      AS avg_orders_day,
          sum(orders_count)        AS total_orders_above_avg,
          count(*)                 AS days_above_avg
        FROM with_avg
        WHERE orders_count > avg_orders_day
        GROUP BY marketplace_item_id
        ORDER BY marketplace_item_id;
  `,
      [marketplaceTitle]
    )) as ItemOrdersStats[];
    for (const order of ordersResult) {
      const findItem = result.find(item => item.marketplaceItemId === Number(order.marketplace_item_id));
      if (!findItem) {
        continue;
      }
      const speedSalesAboveAvg = Number(order.total_orders_above_avg) / Number(order.days_above_avg);
      findItem.totalOrdersAboveAvg = Number(order.total_orders_above_avg);
      findItem.daysAboveAvg = Number(order.days_above_avg);
      findItem.speedSalesAboveAvg = speedSalesAboveAvg;
    }
    return result;
  }

  async getWbOrders(days: number, result: GetDynamicOrders[]) {
    const apiToken = this.configService.get<string>('wbToken');

    const prevDate = new Date(
      new Date(new Date().setDate(new Date().getDate() - days + 1)).setHours(0, 0, 0)
    );
    const prevNinetyDays = new Date(
      new Date(new Date().setDate(new Date().getDate() - 60 + 1)).setHours(0, 0, 0)
    );
    const prevThirtyDays = new Date(
      new Date(new Date().setDate(new Date().getDate() - 30 + 1)).setHours(0, 0, 0)
    );
    const lastWeek = new Date(new Date(new Date().setDate(new Date().getDate() - 7 + 1)).setHours(0, 0, 0));

    const urlOrders = 'https://statistics-api.wildberries.ru/api/v1/supplier/orders';
    const formattedDateFrom = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(prevNinetyDays);
    console.log('wbDate', formattedDateFrom);
    const { data }: { data: GetOrdersWb[] } = await axios.get(urlOrders, {
      params: {
        dateFrom: formattedDateFrom,
        flag: 0
      },
      headers: {
        Authorization: apiToken
      }
    });
    this.logger.log('Получил данные по заказам WB');

    for (const order of data) {
      if (+new Date(order.date) < +new Date(formattedDateFrom)) {
        continue;
      }
      const findItem = result.find(item => item.barcode === order.barcode);
      if (!findItem) {
        continue;
      }
      const orderDate = new Date(order.date);
      findItem.ordersLastNinetyDays += 1;
      if (orderDate >= prevDate) {
        findItem.orders += 1;
        findItem.ordersSum += order.finishedPrice;
      }
      if (orderDate >= prevThirtyDays) {
        findItem.ordersLastThirtyDays += 1;
      }
      if (orderDate >= lastWeek) {
        findItem.ordersLastWeek += 1;
      }
    }

    return result;
  }

  async getYandexOrders(days: number, result: GetDynamicOrders[]) {
    const token = await this.configService.get('yandexToken');
    const companyId = await this.configService.get('yandexCLientId');

    let ordersUrl = `https://api.partner.market.yandex.ru/campaigns/${companyId}/stats/orders`;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const prevNDays = new Date(now);
    prevNDays.setDate(prevNDays.getDate() - days);
    const prevDate = prevNDays.toISOString().split('T')[0];

    const prev30Days = new Date(now);
    prev30Days.setDate(prev30Days.getDate() - 30);
    const prevThirtyDays = prev30Days.toISOString().split('T')[0];

    const prev7Days = new Date(now);
    prev7Days.setDate(prev7Days.getDate() - 7);
    const lastWeek = prev7Days.toISOString().split('T')[0];

    const prev15Days = new Date(now);
    prev15Days.setDate(prev15Days.getDate() - 15);
    const prevFifteenDays = prev15Days.toISOString().split('T')[0];

    const prev14Days = new Date(now);
    prev14Days.setDate(prev14Days.getDate() - 14);
    const prevFourteenDays = prev14Days.toISOString().split('T')[0];

    const prev3Days = new Date(now);
    prev3Days.setDate(prev3Days.getDate() - 3);
    const prevThirdDays = prev3Days.toISOString().split('T')[0];

    const prev60Days = new Date(now);
    prev60Days.setDate(prev60Days.getDate() - 60);
    const prevSixtyDays = prev60Days.toISOString().split('T')[0];

    const prev90NewDays = new Date(now);
    prev90NewDays.setDate(prev90NewDays.getDate() - 90);
    const prevNinetyNewDays = prev90NewDays.toISOString().split('T')[0];

    const prev21Days = new Date(now);
    prev21Days.setDate(prev21Days.getDate() - 21);
    const prevTwentyOneDays = prev21Days.toISOString().split('T')[0];

    let hasMoreData = true;
    let pageToken;

    while (hasMoreData) {
      const { data }: { data: GetOrdersYandex } = await axios.post(
        ordersUrl,
        {
          dateFrom: prevNinetyNewDays,
          dateTo: today,
          hasCis: false
        },
        {
          headers: {
            'Api-Key': token
          }
        }
      );
      for (const order of data.result.orders) {
        order.items.forEach(item => {
          const findItem = result.find(el => el.supplierArticle === item.shopSku);
          if (!findItem) {
            return;
          }
          const count = !item?.details?.length ? item.count : 0;
          findItem.ordersLastNinetyDays += count;
          const orderDate = order.creationDate;

          if (orderDate >= prevThirtyDays && orderDate <= today) {
            findItem.ordersLastThirtyDays += item.count;
          }
          if (orderDate >= prevThirdDays && orderDate <= today) {
            findItem.ordersThirdDays += item.count;
          }
          if (orderDate >= prevSixtyDays && orderDate <= today) {
            findItem.ordersLastSixtyDays += item.count;
          }
          if (orderDate >= prevTwentyOneDays && orderDate <= today) {
            findItem.ordersLastTwentyOneDays += item.count;
          }
          if (orderDate >= lastWeek && orderDate <= today) {
            findItem.ordersLastWeek += item.count;
          }
          if (orderDate >= prevFifteenDays && orderDate <= today) {
            findItem.ordersLastFifteenDays += item.count;
          }
          if (orderDate >= prevFourteenDays && orderDate <= today) {
            findItem.ordersLastFourteenDays += item.count;
          }
          if (orderDate >= prevDate && orderDate <= today) {
            findItem.orders += count;
            const price = item.prices.find(price => price.type === 'BUYER');
            findItem.ordersSum += price ? price.total : 0;
          }
        });
      }
      if (data.result.paging.nextPageToken) {
        hasMoreData = true;
        pageToken = data.result.paging.nextPageToken;
        ordersUrl = `https://api.partner.market.yandex.ru/campaigns/${companyId}/stats/orders?page_token=${pageToken}`;
      } else {
        hasMoreData = false;
      }
    }
    return result;
  }

  @Cron('0 45 * * * *')
  async getOrdersWbV2() {
    const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90));
    const apiToken = this.configService.get<string>('wbToken');
    const urlOrders = 'https://statistics-api.wildberries.ru/api/v1/supplier/orders';
    const response = await axios.get<GetOrdersWb[]>(urlOrders, {
      params: {
        dateFrom: tenDaysAgo,
        flag: 0
      },
      headers: {
        Authorization: apiToken
      }
    });
    const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    if (!findMarketplace) {
      this.logger.error('WB не найден среди МП. Не удалось получить заказы v2');
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const order of response.data) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { title: order.warehouseName }
        });
        if (!findWarehouse) {
          console.log('wb !findWarehouse', order.warehouseName);
          continue;
        }
        const findMarketplaceItem = await queryRunner.manager
          .createQueryBuilder(MarketplaceItems, 'mpItems')
          .leftJoinAndSelect('mpItems.item', 'item')
          .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
          .andWhere('mpItems.marketplaceIdentifier = :marketplaceIdentifier', {
            marketplaceIdentifier: String(order.nmId)
          })
          .getOne();
        if (!findMarketplaceItem) {
          continue;
        }
        const findOrder = await queryRunner.manager.findOne(OrdersV2, {
          where: {
            marketplaceOrderIdentification: order.srid,
            marketplaceItemId: findMarketplaceItem.id
          }
        });
        if (!findOrder) {
          const countItemOrder = await queryRunner.manager.count(OrdersV2, {
            where: {
              marketplaceItemId: findMarketplaceItem.id
            }
          });
          if (!countItemOrder && !findMarketplaceItem.item.wbCreatedAt) {
            await queryRunner.manager.update(
              Items,
              {
                id: findMarketplaceItem.itemId
              },
              {
                wbCreatedAt: new Date(order.date + '+03:00'),
                classification: 'Новинка / A',
                virality: 'виральный предположительно'
              }
            );
          }
          const createOrder = queryRunner.manager.create(OrdersV2, {
            marketplaceOrderIdentification: order.srid,
            marketplaceOrderNumber: order.srid,
            marketplaceOrderPostingNumber: String(order.incomeID),
            quantity: 1,
            price: order.finishedPrice,
            oldPrice: order.totalPrice,
            payout: order.finishedPrice,
            discountValue: Number((order.totalPrice - order.priceWithDisc).toFixed(2)),
            discountPercent: order.discountPercent,
            commissionPercent: order.spp,
            commissionValue: Number((order.spp * order.priceWithDisc).toFixed(2)),
            clusterFrom: order.warehouseName,
            clusterTo: order.oblastOkrugName,
            cancelReasonId: order.isCancel ? 999 : undefined,
            city: order.regionName,
            warehouseId: findWarehouse.id,
            marketplaceId: findMarketplace.id,
            //Приведение к 0 часовому поясу
            marketplaceCreatedAt: new Date(order.date + '+03:00'),
            marketplaceItemId: findMarketplaceItem.id
          });
          await queryRunner.manager.save(OrdersV2, createOrder);
        } else {
          await queryRunner.manager.update(
            OrdersV2,
            { id: findOrder.id },
            {
              quantity: 1,
              price: order.finishedPrice,
              oldPrice: order.totalPrice,
              payout: order.finishedPrice,
              discountValue: Number((order.totalPrice - order.priceWithDisc).toFixed(2)),
              discountPercent: order.discountPercent,
              commissionPercent: order.spp,
              commissionValue: Number((order.spp * order.priceWithDisc).toFixed(2)),
              clusterFrom: order.warehouseName,
              clusterTo: order.oblastOkrugName,
              cancelReasonId: order.isCancel ? 999 : undefined,
              city: order.regionName,
              warehouseId: findWarehouse.id,
              marketplaceId: findMarketplace.id,
              marketplaceCreatedAt: new Date(order.date + '+03:00')
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить заказы WB');
    } finally {
      await queryRunner.release();
    }
    return;
  }

  @Cron('0 */21 * * * *')
  async getOrdersYandexFirst() {
    const businessId = this.configService.get<string>('yandexBusinessId');
    const apiKey = this.configService.get<string>('yandexToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getOrdersYandexV2(businessId, apiKey, 'Yandex');
    return;
  }

  @Cron('0 */22 * * * *')
  async getOrdersYandexSecond() {
    const businessId = this.configService.get<string>('yandexTamovBusinessId');
    const apiKey = this.configService.get<string>('yandexTamovToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getOrdersYandexV2(businessId, apiKey, 'Yandex Tamov');
    return;
  }

  async getOrdersYandexV2(businessId: string, apiKey: string, mpTitle: string) {
    const ordersData: YandexOrderInfoV2[] = [];
    try {
      const monthAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      const finalEndDate = new Date().toISOString().split('T')[0];
      let urlOrders = `https://api.partner.market.yandex.ru/v1/businesses/${businessId}/orders`;

      let hasMoreData = true;
      let pageToken: string | undefined;

      while (hasMoreData) {
        const { data }: { data: GetOrdersYandexV2 } = await axios.post(
          urlOrders,
          {
            date: {
              dateFrom: monthAgo,
              dateTo: finalEndDate
            },
            fake: false
          },
          {
            headers: {
              'Api-Key': apiKey
            }
          }
        );
        for (const order of data.orders) {
          const orderDate = new Date(order.creationDate);
          ordersData.push({
            warehouseId: order.delivery.warehouseId,
            cancelRequested: order.cancelRequested,
            createdAt: orderDate,
            orderId: String(order.orderId),
            orderNumber: order.externalOrderId,
            status: order.status,
            substatus: order.substatus,
            products: order.items.map(product => {
              const subsidy = product?.prices?.subsidy?.value ?? 0;
              const payment = product.prices.payment.value;
              return {
                //Хз что это за id, он не связан с товарам, пихаю его как доп ключ для заказа, они вроде не повторяются
                id: String(product.id),
                offerId: product.offerId,
                name: product.offerName,
                quantity: product.count,
                price: Number((payment + subsidy).toFixed(2)),
                itemsStatuses: product.itemStatuses
              };
            })
          });
        }
        if (data.paging.nextPageToken) {
          hasMoreData = true;
          pageToken = data.paging.nextPageToken;
          urlOrders = `https://api.partner.market.yandex.ru/v1/businesses/${businessId}/orders?page_token=${pageToken}`;
        } else {
          hasMoreData = false;
        }
      }
    } catch (error) {
      this.logger.error('Не смог получить заказы V2 яндекса');
      return;
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: mpTitle });
    if (!findMarketplace) {
      this.logger.error('Yandex не найден среди МП. Не удалось получить заказы v2');
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const order of ordersData) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: order.warehouseId, marketplaceId: findMarketplace.id }
        });
        if (!findWarehouse) {
          continue;
        }
        for (const item of order.products) {
          const findMarketplaceItem = await queryRunner.manager
            .createQueryBuilder(MarketplaceItems, 'mpItems')
            .leftJoinAndSelect('mpItems.item', 'item')
            .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
            .andWhere('item.article = :article', {
              article: item.offerId
            })
            .getOne();
          if (!findMarketplaceItem) {
            continue;
          }
          const findOrder = await queryRunner.manager.findOne(OrdersV2, {
            where: {
              marketplaceOrderIdentification: order.orderId,
              marketplaceCreatedAt: order.createdAt,
              marketplaceOrderNumber: item.id,
              marketplaceItemId: findMarketplaceItem.id
            }
          });
          if (!findOrder) {
            const createOrder = queryRunner.manager.create(OrdersV2, {
              marketplaceOrderIdentification: order.orderId,
              marketplaceOrderNumber: item.id,
              status: order.status,
              quantity: item.quantity,
              price: item.price,
              payout: item.price,
              cancelReasonId: order.cancelRequested ? 999 : undefined,
              warehouseId: findWarehouse.id,
              marketplaceId: findMarketplace.id,
              marketplaceCreatedAt: order.createdAt,
              marketplaceItemId: findMarketplaceItem.id
            });
            await queryRunner.manager.save(OrdersV2, createOrder);
          } else {
            await queryRunner.manager.update(OrdersV2, findOrder.id, {
              status: order.status,
              quantity: item.quantity,
              price: item.price,
              payout: item.price,
              cancelReasonId: order.cancelRequested ? 999 : undefined
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог сохранить заказы Yandex');
    } finally {
      await queryRunner.release();
    }
    return;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async getOrdersOzonFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) {
      this.logger.error('Не найден токен озона или id клиента ozon first');
      return;
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOrdersOzon(ozonToken, clientId, findMarketplace.id);
    return;
  }

  @Cron('2 * * * *')
  async getOrdersOzonSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken || !clientId) {
      this.logger.error('Не найден токен озона или id клиента Ozon Tamov');
      return;
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Tamov' });
    await this.getOrdersOzon(ozonToken, clientId, findMarketplace.id);
    return;
  }

  async getOrdersOzon(ozonToken: string, clientId: string, marketplaceId: number) {
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonUrlOrders = 'https://api-seller.ozon.ru/v3/posting/fbo/list';

    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 2);
    lastMonth.setHours(3, 0, 0, 0);

    const todayEvening = new Date();
    todayEvening.setDate(todayEvening.getDate() + 1);
    todayEvening.setHours(2, 59, 59, 999);

    let hasMoreData = true;
    let cursor = '';

    const orders: GetOrdersResult[] = [];
    try {
      while (hasMoreData) {
        //Запрос на получение заказов
        const response = await axios.post<GetOrdersOzonV2>(
          ozonUrlOrders,
          {
            dir: 'ASC',
            filter: {
              since: lastMonth,
              status: '',
              to: todayEvening
            },
            limit: 100,
            cursor,
            with: {
              analytics_data: true,
              financial_data: true
            }
          },
          { headers }
        );
        if (!response.data.has_next) {
          hasMoreData = false;
        }
        if (!response.data.postings.length) {
          hasMoreData = false;
        }
        cursor = response.data.cursor;
        for (const order of response.data.postings) {
          orders.push({
            warehouseId: order.analytics_data.warehouse_id,
            warehouseTitle: order.analytics_data.warehouse_name,
            cancelReasonId: order.cancel_reason_id,
            createdAt: order.created_at,
            orderId: order.order_id,
            postingNumber: order.posting_number,
            orderNumber: order.order_number,
            status: order.status,
            substatus: order.substatus,
            city: order.analytics_data.city,
            products: order.products.map(product => {
              const findProductFinancialInfo = order.financial_data.products.find(
                el => el.product_id === product.sku
              );
              const financialInfo = {
                payout: 0,
                oldPrice: 0,
                totalDiscountValue: 0,
                totalDiscountPercent: 0,
                commission: {
                  amount: 0,
                  percent: 0
                },
                clusterFrom: '',
                clusterTo: ''
              };
              if (findProductFinancialInfo) {
                financialInfo.payout = findProductFinancialInfo.payout;
                financialInfo.oldPrice = findProductFinancialInfo.old_price;
                financialInfo.totalDiscountValue = findProductFinancialInfo.total_discount_value;
                financialInfo.totalDiscountPercent = findProductFinancialInfo.total_discount_percent;
                financialInfo.commission.amount = findProductFinancialInfo.commission.amount;
                financialInfo.commission.percent = findProductFinancialInfo.commission.percent;
                financialInfo.clusterFrom = order.financial_data.cluster_from;
                financialInfo.clusterTo = order.financial_data.cluster_to;
              }
              return {
                offerId: product.offer_id,
                name: product.name,
                sku: product.sku,
                quantity: product.quantity,
                price: Number(product.price.amount),
                ...financialInfo
              };
            })
          });
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить данные по заказам Озон');
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const order of orders) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: {
            marketplaceInternalNumber: String(order.warehouseId),
            marketplaceId
          }
        });
        if (!findWarehouse) {
          continue;
        }
        for (const item of order.products) {
          // const findItem = await queryRunner.manager.findOne(Items, {
          //   where: {
          //     marketplaceId,
          //     sku: String(item.sku)
          //   }
          // });
          // if (!findItem) {
          //   continue;
          // }
          const findMarketplaceItem = await queryRunner.manager
            .createQueryBuilder(MarketplaceItems, 'mpItems')
            .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId })
            .andWhere('mpItems.sku = :sku', {
              sku: String(item.sku)
            })
            .getOne();
          if (!findMarketplaceItem) {
            continue;
          }
          const findOrder = await queryRunner.manager.findOne(OrdersV2, {
            where: {
              marketplaceOrderIdentification: String(order.orderId),
              marketplaceOrderPostingNumber: String(order.postingNumber),
              marketplaceItemId: findMarketplaceItem.id
            }
          });
          if (!findOrder) {
            const createOrder = queryRunner.manager.create(OrdersV2, {
              marketplaceOrderIdentification: String(order.orderId),
              marketplaceOrderNumber: String(order.orderNumber),
              marketplaceOrderPostingNumber: order.postingNumber,
              status: order.status,
              quantity: item.quantity,
              price: item.price,
              oldPrice: item.oldPrice,
              payout: item.payout,
              discountValue: item.totalDiscountValue,
              discountPercent: item.totalDiscountPercent,
              commissionPercent: item.commission.percent,
              commissionValue: item.commission.amount,
              clusterFrom: item.clusterFrom,
              clusterTo: item.clusterTo,
              cancelReasonId: order.cancelReasonId,
              city: order.city,
              warehouseId: findWarehouse.id,
              marketplaceId,
              marketplaceCreatedAt: order.createdAt,
              marketplaceItemId: findMarketplaceItem.id
            });
            await queryRunner.manager.save(OrdersV2, createOrder);
          } else {
            await queryRunner.manager.update(OrdersV2, findOrder.id, {
              status: order.status,
              quantity: item.quantity,
              price: item.price,
              oldPrice: item.oldPrice,
              payout: item.payout,
              discountValue: item.totalDiscountValue,
              discountPercent: item.totalDiscountPercent,
              commissionPercent: item.commission.percent,
              commissionValue: item.commission.amount,
              clusterFrom: item.clusterFrom,
              clusterTo: item.clusterTo,
              cancelReasonId: order.cancelReasonId,
              city: order.city
            });
          }
        }

        //     if (!findOrder) {
        //       const countItemOrder = await queryRunner.manager.count(Orders, {
        //         where: {
        //           itemId: findItem.id
        //         }
        //       });
        //       if (!countItemOrder) {
        //         await queryRunner.manager.update(
        //           Items,
        //           {
        //             id: findItem.id
        //           },
        //           {
        //             wbCreatedAt: new Date(order.createdAt),
        //             classification: 'Новинка / A',
        //             virality: 'виральный предположительно'
        //           }
        //         );
        //       }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Не смог скачать заказы Ozon ${marketplaceId}`);
    } finally {
      await queryRunner.release();
    }
  }

  getMonthlyIntervals(startDate: Date, endDate: Date): { startDate: Date; finishDate: Date }[] {
    const intervals: {
      startDate: Date;
      finishDate: Date;
    }[] = [];

    let cursor = new Date(startDate);

    while (cursor <= endDate) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();

      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Ограничиваем месяца входным диапазоном
      const rangeStart = cursor > monthStart ? cursor : monthStart;
      const rangeEnd = monthEnd < endDate ? monthEnd : endDate;

      // Дней в месяце
      const daysInMonth = monthEnd.getDate();

      // Размер равных интервалов
      const base = Math.floor(daysInMonth / 3);
      let remainder = daysInMonth % 3; // распределяем остаток

      let dayPointer = 1;

      for (let i = 0; i < 3; i++) {
        const size = base + (remainder > 0 ? 1 : 0);
        remainder--;

        const startDay = dayPointer;
        const endDay = dayPointer + size - 1;

        dayPointer = endDay + 1;

        const intervalStart = new Date(year, month, startDay);
        const intervalEnd = new Date(year, month, endDay);

        // Пересечение с входным диапазоном
        if (intervalEnd >= rangeStart && intervalStart <= rangeEnd) {
          intervals.push({
            startDate: intervalStart < rangeStart ? new Date(rangeStart) : intervalStart,
            finishDate:
              intervalEnd > rangeEnd
                ? new Date(rangeEnd.setHours(23, 59, 59, 999))
                : new Date(intervalEnd.setHours(23, 59, 59, 999))
          });
        }
      }

      // Переходим к следующему месяцу
      cursor = new Date(year, month + 1, 1);
    }

    return intervals;
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
