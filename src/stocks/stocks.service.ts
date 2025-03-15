import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ItemsService } from '../items/items.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InfoService } from '../info/info.service';
import { OzonStocks, StocksResult } from './interfaces/ozon-stocks.interface';
import { Stocks } from './entities/stocks.entity';

@Injectable()
export class StocksService {
  constructor(
    private dataSource: DataSource,
    private itemsService: ItemsService,
    private configService: ConfigService,
    private infoService: InfoService
  ) {}

  private logger: Logger = new Logger(StocksService.name);

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

  @Cron('0 */15 * * * *')
  async getOzonStocks() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };

    const urlStocks = 'https://api-seller.ozon.ru/v2/analytics/stock_on_warehouses';
    let hasMoreData = true;
    let offset = 0;

    const stocks: StocksResult[] = [];

    while (hasMoreData) {
      const { data }: { data: OzonStocks } = await axios.post(
        urlStocks,
        {
          filter: {
            visibility: 'ALL'
          },
          limit: 1000,
          offset
        },
        { headers }
      );

      if (!data.result.rows.length) {
        hasMoreData = false;
      } else {
        for (const item of data.result.rows) {
          stocks.push({
            article: item.item_code,
            sku: String(item.sku),
            reserved: item.reserved_amount,
            current: item.free_to_sell_amount,
            promised: item.promised_amount,
            warehouse: item.warehouse_name
          });
        }
        offset += 1000;
      }
    }
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    for (const stock of stocks) {
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const warehouse = await this.infoService.findOrCreateWarehouses(
          { title: stock.warehouse },
          queryRunner
        );
        const findItem = await this.itemsService.findItem({ sku: stock.sku }, queryRunner);
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('item_id = :itemId', { itemId: findItem.id })
          .andWhere('warehouse_id = :warehouseId', { warehouseId: warehouse.id })
          .getOne();
        if (findStock) {
          await queryRunner.manager.update(
            Stocks,
            { id: findStock.id },
            {
              currentValue: stock.current,
              reserved: stock.reserved,
              promised: stock.promised
            }
          );
        } else {
          const createStock = await queryRunner.manager.create(Stocks, {
            itemId: findItem.id,
            warehouseId: warehouse.id,
            currentValue: stock.current,
            reserved: stock.reserved,
            promised: stock.promised,
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error('Не смог обновить остатки Ozon');
        this.logger.error(error);
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }
}
