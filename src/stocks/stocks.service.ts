import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ItemsService } from '../items/items.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StocksService {
  constructor(
    private dataSource: DataSource,
    private itemsService: ItemsService,
    private configService: ConfigService
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getStocks() {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const apiToken = await this.configService.get('wbToken');
      const urlStocks = 'https://statistics-api.wildberries.ru/api/v1/supplier/stocks';
      const getWbStocks = await axios.get(urlStocks, {
        params: {
          dateFrom: '2019-09-06T20:00:00Z'
        },
        headers: {
          Authorization: apiToken
        }
      });
      console.log(getWbStocks);
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
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
