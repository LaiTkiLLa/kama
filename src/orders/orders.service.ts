import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { GetOrdersOzon, GetOrdersResult } from './interfaces/get-orders-ozon.interface';
import { ItemsService } from '../items/items.service';
import { InfoService } from '../info/info.service';
import { Orders } from './entities/orders.entity';
import { GetOrdersWb } from './interfaces/get-orders-wb.interface';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
    private itemsService: ItemsService,
    private infoService: InfoService
  ) {}

  private logger: Logger = new Logger(OrdersService.name);

  @Cron('0 */23 * * * *')
  async getOrdersWb() {
    const today = new Date();
    const todayMorning = new Date(today.setHours(3, 0, 0, 0));
    const apiToken = await this.configService.get('wbToken');
    const urlOrders = 'https://statistics-api.wildberries.ru/api/v1/supplier/orders';
    const { data }: { data: GetOrdersWb[] } = await axios.get(urlOrders, {
      params: {
        dateFrom: todayMorning,
        flag: 1
      },
      headers: {
        Authorization: apiToken
      }
    });
    const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    for (const order of data) {
      const queryRunner = await this.dataSource.createQueryRunner();
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
        const orderDate = new Date(`${order.date}Z`)
        const findOrder = await queryRunner.manager.findOne(Orders, {
          where: {
            marketplaceOrderIdentification: order.gNumber,
            createdAt: orderDate,
            itemId: findItem.id
          }
        });
        if (!findOrder) {
          const createOrder = await queryRunner.manager.create(Orders, {
            quantity: 1,
            sum: order.finishedPrice,
            marketplaceOrderIdentification: String(order.gNumber),
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
        this.logger.error(error);
        this.logger.error('Не смог сказать заказы WB');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron('0 */22 * * * *')
  @Cron('0 55 23 * * *')
  async getOrdersOzon() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonUrlOrders = 'https://api-seller.ozon.ru/v2/posting/fbo/list';

    const todayMorning = new Date();
    todayMorning.setHours(3, 0, 0);

    const todayEvening = new Date();
    todayEvening.setDate(todayEvening.getDate() + 1);
    todayEvening.setHours(2, 59, 59, 999);

    let hasMoreData = true;
    let offset = 0;

    const orders: GetOrdersResult[] = [];

    while (hasMoreData) {
      //Запрос на получение заказов
      const { data }: { data: GetOrdersOzon } = await axios.post(
        ozonUrlOrders,
        {
          dir: 'ASC',
          filter: {
            since: todayMorning,
            status: '',
            to: todayEvening
          },
          limit: 1000,
          offset,
          with: {
            analytics_data: true,
            financial_data: true
          }
        },
        { headers }
      );

      if (data.result.length === 0) {
        hasMoreData = false;
      } else {
        offset += 1000;
        for (const order of data.result) {
          order.products.map(item => {
            orders.push({
              sku: String(item.sku),
              quantity: item.quantity,
              sum: item.price,
              article: item.offer_id,
              warehouse: order.analytics_data.warehouse_name,
              cancelReasonId: order.cancel_reason_id,
              createdAt: order.created_at,
              orderId: order.order_id
            });
          });
        }
      }
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    for (const order of orders) {
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findItem = await this.itemsService.findItem({ sku: order.sku }, queryRunner);
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
          { title: order.warehouse },
          queryRunner
        );
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        const findOrder = await queryRunner.manager.findOne(Orders, {
          where: {
            marketplaceOrderIdentification: String(order.orderId),
            createdAt: new Date(order.createdAt),
            itemId: findItem.id
          }
        });
        const isCanceled = order.cancelReasonId ? true : false;
        if (!findOrder) {
          const createOrder = await queryRunner.manager.create(Orders, {
            quantity: order.quantity,
            sum: Number(order.sum),
            marketplaceOrderIdentification: String(order.orderId),
            isCanceled,
            itemId: findItem.id,
            warehouseId: findWarehouse.id,
            createdAt: new Date(order.createdAt),
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Orders, createOrder);
        } else {
          await queryRunner.manager.update(
            Orders,
            { id: findOrder.id },
            {
              quantity: order.quantity,
              isCanceled,
              sum: Number(order.sum)
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        this.logger.error(error);
        this.logger.error('Не смог сказать заказы Ozon');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }
}
