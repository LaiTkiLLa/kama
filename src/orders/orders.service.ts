import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { GetOrdersOzon, GetOrdersResult } from './interfaces/get-orders-ozon.interface';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(OrdersService.name);

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getOrdersOzon() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonUrlOrders = 'https://api-seller.ozon.ru/v2/posting/fbo/list';

    let todayMorning = new Date();
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
          console.log(order);
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
  }
}
