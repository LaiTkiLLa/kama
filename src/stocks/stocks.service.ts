import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ItemsService } from '../items/items.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InfoService } from '../info/info.service';
import { OzonStocks, StocksResult } from './interfaces/ozon-stocks.interface';
import { Marketplaces } from '../info/entities/marketplaces.entity';

@Injectable()
export class StocksService {
  constructor(
    private dataSource: DataSource,
    private itemsService: ItemsService,
    private configService: ConfigService,
    private infoService: InfoService
  ) {}

  // @Cron(CronExpression.EVERY_10_SECONDS)
  async getStocks() {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const apiToken = await this.configService.get('wbToken');
      const urlStocks = 'https://statistics-api.wildberries.ru/api/v1/supplier/stocks';
      const getWbStocks = await axios.get(urlStocks, {
        params: {
          dateFrom: '2019-09-06'
        },
        headers: {
          Authorization: apiToken
        }
      });
      const warehouses = getWbStocks.data.map(item => item.warehouseName);
      const unique = [...new Set(warehouses)];
      for (const item of getWbStocks.data) {
        await this.infoService.findOrCreateWarehouses({ title: item.warehouseName }, queryRunner);
      }
      //Получаем значения со склада
      // for (const dataStock of dataStocks){
      //   const findBarcode = result.find(item => item.barcode === dataStock.barcode)
      //   if (findBarcode){
      //     findBarcode.inWayToClient += dataStock.inWayToClient
      //     findBarcode.inWayFromClient += dataStock.inWayFromClient
      //     findBarcode.quantityFull += (dataStock.quantityFull - dataStock.inWayToClient - dataStock.inWayFromClient)
      //     if (findBarcode.supplierArticle !== dataStock.supplierArticle){
      //       findBarcode.newSupplierArticle = dataStock.supplierArticle
      //     }
      //   } else {
      //     const imageUrl = compareUrl(dataStock.nmId)
      //     result.push({
      //       nmId: dataStock.nmId,
      //       supplierArticle: dataStock.supplierArticle,
      //       newSupplierArticle: dataStock.supplierArticle,
      //       barcode: dataStock.barcode,
      //       orders: 0,
      //       //Заказы за последний месяц
      //       orderLastMonth: 0,
      //       imageUrl,
      //       subject: dataStock.subject,
      //       category: dataStock.category,
      //       inWayToClient: dataStock.inWayToClient,
      //       inWayFromClient: dataStock.inWayFromClient,
      //       quantityFull: dataStock.quantityFull - dataStock.inWayToClient - dataStock.inWayFromClient,
      //       ordersSum: 0,
      //       //В приемке на МП
      //       inAcceptance: 0,
      //       onTheWay: 0,
      //       quantityFulfillment: 0,
      //       salesSpeed: 0,
      //       //срок производства
      //       productionTime: 0,
      //       //срок сборки
      //       assemblyPeriod: 0,
      //       //Срок доставки
      //       deliveryTime: 0,
      //       //Срок отгрузки
      //       shipmentTime: 0,
      //       //Запас
      //       reserve: 0,
      //       //Запас в процентах
      //       reserveInPersent: 0,
      //       //Себестоимость
      //       cost: 0,
      //       //% месячного роста
      //       growthPercent: 0,
      //       //Продажная цена
      //       salePrice: 0,
      //       //Поставщик
      //       supplier: '',
      //       //Средняя цена продажи за период
      //       middlePrice: 0
      //     })
      //   }
      // }
      await queryRunner.commitTransaction();
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  // @Cron(CronExpression.EVERY_10_SECONDS)
  async getOzonStocks() {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' }, queryRunner);
      const ozonToken = await this.configService.get('ozonToken');
      const clientId = await this.configService.get('ozonClientId');
      const headers = {
        'Client-Id': clientId,
        'Api-Key': ozonToken
      };
      const listItemsBody = {
        sku: []
      };

      const urlStocksMore = 'https://api-seller.ozon.ru/v4/product/info/stocks';
      //Запрос на получение остатков на складах
      const requestFullStocks: { data: OzonStocks } = await axios.post(
        urlStocksMore,
        {
          cursor: '',
          filter: {
            visibility: 'ALL'
          },
          limit: 1000
        },
        { headers }
      );
      const stocks: StocksResult[] = [];
      for (const item of requestFullStocks.data.items) {
        if (item.stocks.length) {
          item.stocks.forEach(stock => {
            stocks.push({
              article: item.offer_id,
              category: '',
              title: '',
              barcode: stock.sku.toString(),
              marketplaceIdentifier: stock.sku,
              reserved: stock.reserved,
              present: stock.present,
              marketplaceId: ozonMarketplace.id
            });
          });
        }
        console.log(stocks);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
    } finally {
      await queryRunner.release();
    }
  }
  //
  // return result
  // }
}
