import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetOrdersOzonV2, GetOrdersResult } from './interfaces/get-orders-ozon.interface';
import { ItemsService } from '../items/items.service';
import { InfoService } from '../info/info.service';
import { Orders } from './entities/orders.entity';
import { GetOrdersWb } from './interfaces/get-orders-wb.interface';
import { GetOrdersYandex, YandexOrderInfo } from './interfaces/get-orders-yandex.interface';
import { Items } from '../items/entities/items.entity';
import { GetDynamicOrdersDto } from './dto/get-dynamic-orders.dto';
import { StocksService } from '../stocks/stocks.service';
import { GetDynamicOrders } from './interfaces/get-dynamic-orders.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Warehouses } from '../info/entities/warehouses.entity';
import { OrdersV2 } from './entities/orders_v2.entity';

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
          suppliers: getDynamicOrdersDto?.suppliers?.length ? getDynamicOrdersDto.suppliers : undefined
        },
        queryRunner
      );

      for (const item of responseStocks) {
        result.push({
          supplierArticle: item.supplierArticle,
          sku: Number(item.sku),
          itemId: item.id,
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
          intervalOrders: [0, 0, 0, 0, 0, 0],
          intervalSpeedSales: [0, 0, 0, 0, 0, 0]
        });
      }
      if (getDynamicOrdersDto.marketplace === 'Озон') {
        return this.getOrders(getDynamicOrdersDto.days, 'Озон', result);
      } else if (getDynamicOrdersDto.marketplace === 'WB') {
        return this.getOrders(getDynamicOrdersDto.days, 'WB', result);
      } else if (getDynamicOrdersDto.marketplace === 'Yandex') {
        return this.getYandexOrders(getDynamicOrdersDto.days, result);
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить остатки и заказы');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrders(days: number, marketplaceTitle: 'Озон' | 'WB', result: GetDynamicOrders[]) {
    const prevDate = this.daysAgo(days);
    const prevThirdDays = this.daysAgo(3);
    const prevNinetyDays = this.daysAgo(90);
    const prevSixtyDays = this.daysAgo(60);
    const prevThirtyDays = this.daysAgo(30);
    const prevFifteenDays = this.daysAgo(15);
    const prevTwentyOneDays = this.daysAgo(21);
    const prevFourteenDays = this.daysAgo(14);
    const lastWeek = this.daysAgo(7);

    // границы 6 интервалов по 15 дней: [0], [15], [30], [45], [60], [75], [90]
    const intervalSize = 15;
    const intervalsCount = 6;
    const intervalBoundaries = Array.from({ length: intervalsCount + 1 }, (_, i) =>
      this.daysAgo(i * intervalSize)
    );

    const orders = await this.dataSource.manager
      .createQueryBuilder(OrdersV2, 'orders')
      .leftJoinAndSelect('orders.marketplace', 'marketplace')
      .where('orders.marketplaceCreatedAt >= :prevNinetyDays', {
        prevNinetyDays
      })
      .andWhere('marketplace.title = :marketplaceTitle', { marketplaceTitle })
      .getMany();
    for (const order of orders) {
      const findItem = result.find(item => item.itemId === order.itemId);
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

      // распределение по 15-дневным интервалам
      for (let i = 0; i < intervalsCount; i++) {
        const upperBound = intervalBoundaries[i]; // ближе к сегодня
        const lowerBound = intervalBoundaries[i + 1]; // дальше от сегодня
        if (orderDate >= lowerBound && orderDate < upperBound) {
          findItem.intervalOrders[i] += order.quantity;
          break; // попал в один интервал — дальше не проверяем
        }
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

      // скорость продаж по каждому 15-дневному интервалу
      item.intervalSpeedSales = item.intervalOrders.map(qty => qty / intervalSize);
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

    // границы 6 интервалов по 15 дней в виде строк 'YYYY-MM-DD'
    const intervalSize = 15;
    const intervalsCount = 6;
    const intervalBoundaries = Array.from({ length: intervalsCount + 1 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i * intervalSize);
      return d.toISOString().split('T')[0];
    });

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

          console.log(
            'orderDate:',
            orderDate,
            'intervalBoundaries:',
            intervalBoundaries,
            'intervalOrders before:',
            findItem.intervalOrders
          );
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

          // распределение по 15-дневным интервалам
          for (let i = 0; i < intervalsCount; i++) {
            const upperBound = intervalBoundaries[i];
            const lowerBound = intervalBoundaries[i + 1];
            if (orderDate >= lowerBound && orderDate < upperBound) {
              findItem.intervalOrders[i] += item.count;
              break;
            }
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

  @Cron('0 */23 * * * *')
  async getOrdersWb() {
    const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 10));
    const apiToken = this.configService.get<string>('wbToken');
    const urlOrders = 'https://statistics-api.wildberries.ru/api/v1/supplier/orders';
    const { data }: { data: GetOrdersWb[] } = await axios.get(urlOrders, {
      params: {
        dateFrom: tenDaysAgo,
        flag: 0
      },
      headers: {
        Authorization: apiToken
      }
    });
    const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    for (const order of data) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findItem = await this.itemsService.findItem(
          { marketplaceIdentifier: String(order.nmId) },
          queryRunner
        );
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
          { title: order.warehouseName },
          queryRunner
        );
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        const orderDate = new Date(`${order.date}Z`);
        const findOrder = await queryRunner.manager.findOne(Orders, {
          where: {
            marketplaceOrderIdentification: order.srid,
            createdAt: orderDate,
            itemId: findItem.id
          }
        });
        if (!findOrder) {
          const countItemOrder = await queryRunner.manager.count(Orders, {
            where: {
              itemId: findItem.id
            }
          });
          if (!countItemOrder) {
            await queryRunner.manager.update(
              Items,
              {
                id: findItem.id
              },
              {
                wbCreatedAt: orderDate,
                classification: 'Новинка / A',
                virality: 'виральный предположительно'
              }
            );
          }
          const createOrder = queryRunner.manager.create(Orders, {
            quantity: 1,
            sum: order.finishedPrice,
            marketplaceOrderIdentification: order.srid,
            isCanceled: order.isCancel,
            itemId: findItem.id,
            totalPrice: order.totalPrice,
            spp: order.spp,
            priceWithDisc: order.priceWithDisc,
            warehouseId: findWarehouse.id,
            createdAt: orderDate,
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Orders, createOrder);
        } else {
          await queryRunner.manager.update(
            Orders,
            { id: findOrder.id },
            {
              isCanceled: order.isCancel,
              sum: order.finishedPrice,
              totalPrice: order.totalPrice,
              spp: order.spp,
              priceWithDisc: order.priceWithDisc
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не смог сказать заказы WB');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron('0 45 * * * *')
  async getOrdersWbV2() {
    const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 43));
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
          continue;
        }
        const findItem = await this.itemsService.findItem(
          { marketplaceIdentifier: String(order.nmId), marketplaceId: findMarketplace.id },
          queryRunner
        );
        if (!findItem) {
          continue;
        }
        const findOrder = await queryRunner.manager.findOne(OrdersV2, {
          where: {
            marketplaceOrderIdentification: order.srid,
            itemId: findItem.id
          }
        });
        if (!findOrder) {
          // const countItemOrder = await queryRunner.manager.count(Orders, {
          //   where: {
          //     itemId: findItem.id
          //   }
          // });
          // if (!countItemOrder) {
          //   await queryRunner.manager.update(
          //     Items,
          //     {
          //       id: findItem.id
          //     },
          //     {
          //       wbCreatedAt: orderDate,
          //       classification: 'Новинка / A',
          //       virality: 'виральный предположительно'
          //     }
          //   );
          // }
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
            itemId: findItem.id,
            warehouseId: findWarehouse.id,
            marketplaceId: findMarketplace.id,
            //Приведение к 0 часовому поясу
            marketplaceCreatedAt: new Date(order.date + '+03:00')
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
  async getOrdersYandex() {
    const monthAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const finalEndDate = new Date().toISOString().split('T')[0];
    const apiToken = await this.configService.get('yandexToken');
    const companyId = await this.configService.get('yandexCLientId');
    let urlOrders = `https://api.partner.market.yandex.ru/campaigns/${companyId}/stats/orders`;

    let hasMoreData = true;
    let pageToken;

    const ordersData: YandexOrderInfo[] = [];

    const rejectedStatuses = [
      'CANCELLED_BEFORE_PROCESSING',
      'CANCELLED_IN_DELIVERY',
      'CANCELLED_IN_PROCESSING',
      'RETURNED'
    ];

    while (hasMoreData) {
      const { data }: { data: GetOrdersYandex } = await axios.post(
        urlOrders,
        {
          dateFrom: monthAgo,
          dateTo: finalEndDate,
          hasCis: false
        },
        {
          headers: {
            'Api-Key': apiToken
          }
        }
      );
      for (const order of data.result.orders) {
        order.items.forEach(item => {
          const findRejectedStatus = rejectedStatuses.find(el => el === order.status);
          const price = item.prices.find(price => price.type === 'BUYER');
          ordersData.push({
            orderId: String(order.id),
            marketSku: item.marketSku,
            shopSku: item.shopSku,
            count: !item?.details?.length ? item.count : 0,
            orderDate: order.creationDate,
            warehouseId: String(item.warehouse.id),
            orderSum: price ? price.total : 0,
            isCancel: findRejectedStatus ? true : false
          });
        });
      }
      if (data.result.paging.nextPageToken) {
        hasMoreData = true;
        pageToken = data.result.paging.nextPageToken;
        urlOrders = `https://api.partner.market.yandex.ru/campaigns/${companyId}/stats/orders?page_token=${pageToken}`;
      } else {
        hasMoreData = false;
      }
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Yandex' });
    for (const order of ordersData) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findItem = await this.itemsService.findItem(
          { marketplaceIdentifier: String(order.marketSku) },
          queryRunner
        );
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: order.warehouseId }
        });
        if (!findWarehouse) {
          await queryRunner.commitTransaction();
          continue;
        }

        const orderDate = new Date(`${order.orderDate}Z`);
        const findOrder = await queryRunner.manager.findOne(Orders, {
          where: {
            marketplaceOrderIdentification: order.orderId,
            createdAt: orderDate,
            itemId: findItem.id
          }
        });
        if (!findOrder) {
          const countItemOrder = await queryRunner.manager.count(Orders, {
            where: {
              itemId: findItem.id
            }
          });
          if (!countItemOrder) {
            await queryRunner.manager.update(
              Items,
              {
                id: findItem.id
              },
              {
                wbCreatedAt: orderDate,
                classification: 'Новинка / A',
                virality: 'виральный предположительно'
              }
            );
          }
          const createOrder = queryRunner.manager.create(Orders, {
            quantity: order.count,
            sum: order.orderSum,
            marketplaceOrderIdentification: String(order.orderId),
            isCanceled: order.isCancel,
            itemId: findItem.id,
            totalPrice: order.orderSum,
            warehouseId: findWarehouse.id,
            createdAt: orderDate,
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Orders, createOrder);
        } else {
          await queryRunner.manager.update(
            Orders,
            { id: findOrder.id },
            {
              quantity: order.count,
              sum: order.orderSum,
              isCanceled: order.isCancel,
              totalPrice: order.orderSum
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не смог добавить заказы Yandex');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async getOrdersOzonFirst() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOrdersOzon(ozonToken, clientId, findMarketplace.id);
    return;
  }

  // @Cron('0 */24 * * * *')
  async getOrdersOzonSecond() {
    const ozonToken = await this.configService.get('ozonSecondToken');
    const clientId = await this.configService.get('ozonSecondClientId');
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Second' });
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
    lastMonth.setDate(lastMonth.getDate() - 40);
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
            marketplaceInternalNumber: String(order.warehouseId)
          }
        });
        if (!findWarehouse) {
          continue;
        }
        for (const item of order.products) {
          const findItem = await queryRunner.manager.findOne(Items, {
            where: {
              marketplaceId,
              sku: String(item.sku)
            }
          });
          if (!findItem) {
            continue;
          }
          const findOrder = await queryRunner.manager.findOne(OrdersV2, {
            where: {
              marketplaceOrderIdentification: String(order.orderId),
              marketplaceOrderPostingNumber: String(order.postingNumber),
              itemId: findItem.id
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
              itemId: findItem.id,
              warehouseId: findWarehouse.id,
              marketplaceId,
              marketplaceCreatedAt: order.createdAt
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
