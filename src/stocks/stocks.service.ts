import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ItemsService } from '../items/items.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InfoService } from '../info/info.service';
import { OzonStocks, StocksResult } from './interfaces/ozon-stocks.interface';
import { Stocks } from './entities/stocks.entity';
import { GetWbStocks } from './interfaces/wb-stocks.intrerface';
import { GetCurrentStocksDto } from './dto/get-current-stocks.dto';
import { GetCurrentStocks } from './interfaces/get-current-stocks.interface';
import { GetYandexStocks, ItemTypes } from './interfaces/yandex-stocks.interface';
import { GetStocksByDateDto } from './dto/get-stocks-by-date.dto';
import { GetStocksByDate } from './interfaces/get-stocks-by-date.interface';

@Injectable()
export class StocksService {
  constructor(
    private dataSource: DataSource,
    private itemsService: ItemsService,
    private configService: ConfigService,
    private infoService: InfoService
  ) {}

  private logger: Logger = new Logger(StocksService.name);

  async getCurrentStocks(getCurrentStocksDto: GetCurrentStocksDto): Promise<GetCurrentStocks[]> {
    const today = new Date();
    const findStocks = await this.dataSource.manager
      .createQueryBuilder(Stocks, 'stocks')
      .leftJoinAndSelect('stocks.marketplace', 'marketplace')
      .leftJoinAndSelect('stocks.item', 'item')
      .where('marketplace.title = :marketplace', { marketplace: getCurrentStocksDto.marketplace })
      .andWhere('Date(stocks.createdAt) = Date(:today)', { today })
      .getMany();
    return findStocks.reduce((acc: GetCurrentStocks[], stock) => {
      const findItem = acc.find(item => stock.itemId === item.itemId);
      if (findItem) {
        findItem.quantityFull += stock.currentValue;
        findItem.inWayToClient += stock.reserved;
        findItem.inWayFromClient += stock.promised;
      } else {
        acc.push({
          nmId: Number(stock.item.marketplaceIdentifier),
          supplierArticle: stock.item.article,
          barcode: Number(stock.item.barcode),
          orders: 0,
          orderLastMonth: 0,
          imageUrl: stock.item.imageUrl,
          inWayToClient: stock.reserved,
          inWayFromClient: stock.promised,
          quantityFull: stock.currentValue,
          sku: stock.item.sku,
          ordersSum: 0,
          inAcceptance: 0,
          salesSpeed: 0,
          planTime: 0,
          assemblyPeriod: 0,
          deliveryTime: 0,
          shipmentTime: 0,
          reserve: 0,
          reserveInPercent: 0,
          cost: 0,
          growthPercent: 0,
          salePrice: 0,
          supplier: '',
          middlePrice: 0,
          itemId: stock.itemId
        });
      }
      return acc;
    }, []);
  }

  async getStocksByDate(getStocksByDateDto: GetStocksByDateDto): Promise<GetStocksByDate[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      return queryRunner.manager
        .createQueryBuilder(Stocks, 'stocks')
        .select([
          'stocks.item_id AS "itemId"',
          'stocks.marketplace_id AS "marketplaceId"',
          'SUM(stocks.current_value) AS "currentValue"',
          'SUM(stocks.reserved) AS "reserved"',
          'SUM(stocks.promised) AS "promised"',
          'DATE(stocks.created_at) as "date"',
          'item.article AS "article"',
          'marketplace.title as "marketplaceTitle"'
        ])
        .leftJoin('stocks.item', 'item')
        .leftJoin('stocks.marketplace', 'marketplace')
        .where('DATE(stocks.created_at) IN (:...date)', { date: getStocksByDateDto.date })
        .groupBy('stocks.item_id')
        .addGroupBy('stocks.marketplace_id')
        .addGroupBy('DATE(stocks.created_at)')
        .addGroupBy('item.article')
        .addGroupBy('marketplace.title')
        .getRawMany();
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список остатков на дату');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */18 * * * *')
  async getWbStocks() {
    const apiToken = await this.configService.get('wbToken');
    const urlStocks = 'https://statistics-api.wildberries.ru/api/v1/supplier/stocks';
    const { data }: { data: GetWbStocks[] } = await axios.get(urlStocks, {
      params: {
        dateFrom: '2019-09-06'
      },
      headers: {
        Authorization: apiToken
      }
    });
    const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    for (const stock of data) {
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
          { title: stock.warehouseName },
          queryRunner
        );
        const findItem = await this.itemsService.findItem(
          { marketplaceIdentifier: String(stock.nmId), marketplaceId: findMarketplace.id },
          queryRunner
        );
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        await this.itemsService.updateItem({ id: findItem.id }, { barcode: stock.barcode }, queryRunner);
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('item_id = :itemId', { itemId: findItem.id })
          .andWhere('warehouse_id = :warehouseId', { warehouseId: findWarehouse.id })
          .getOne();
        if (findStock) {
          await queryRunner.manager.update(
            Stocks,
            { id: findStock.id },
            {
              currentValue: stock.quantity,
              reserved: stock.inWayToClient,
              promised: stock.inWayFromClient
            }
          );
        } else {
          const createStock = await queryRunner.manager.create(Stocks, {
            itemId: findItem.id,
            warehouseId: findWarehouse.id,
            currentValue: stock.quantity,
            reserved: stock.inWayToClient,
            promised: stock.inWayFromClient,
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не смог скачать остатки WB');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron('0 */25 * * * *')
  async getOzonStocksFirst() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    await this.getOzonStocks(clientId, ozonToken)
    return;
  }

  @Cron('0 */26 * * * *')
  async getOzonStocksSecond() {
    const ozonToken = await this.configService.get('ozonSecondToken');
    const clientId = await this.configService.get('ozonSecondClientId');
    await this.getOzonStocks(clientId, ozonToken)
    return;
  }

  @Cron('0 */22 * * * *')
  async getYandexStocks() {
    const yandexToken = await this.configService.get('yandexToken');
    const clientId = await this.configService.get('yandexClientId');
    const urlStocks = `https://api.partner.market.yandex.ru/campaigns/${clientId}/offers/stocks?limit=200`;
    const { data }: { data: GetYandexStocks } = await axios.post(
      urlStocks,
      {
        withTurnover: true
      },
      {
        headers: {
          'Api-Key': yandexToken
        }
      }
    );
    const stocks: {
      warehouseId: number;
      items: {
        supplierArticle: string;
        stocks: { type: ItemTypes; count: number }[];
      }[];
    }[] = [];

    for (const warehouse of data.result.warehouses) {
      warehouse.offers.map(offer => {
        const findWarehouse = stocks.find(stock => stock.warehouseId === warehouse.warehouseId);
        if (findWarehouse) {
          findWarehouse.items.push({ supplierArticle: offer.offerId, stocks: offer.stocks });
        } else {
          stocks.push({
            warehouseId: warehouse.warehouseId,
            items: [
              {
                supplierArticle: offer.offerId,
                stocks: offer.stocks
              }
            ]
          });
        }
      });
    }

    const findMarketplace = await this.infoService.findMarketplace({ title: 'Yandex' });
    const result: {
      itemId: number;
      warehouseId: number;
      currentValue: number;
      reserved: number;
      promised: number;
      marketplaceId: number;
    }[] = [];
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const stock of stocks) {
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
          { marketplaceId: String(stock.warehouseId) },
          queryRunner
        );
        for (const item of stock.items) {
          const findItem = await this.itemsService.findItem(
            { article: item.supplierArticle, marketplaceId: findMarketplace.id },
            queryRunner
          );
          if (!findItem) {
            continue;
          }
          //Карантин
          let quarantine = 0;
          //Годный
          let fit = 0;
          //   //Утилизация
          //   let utilization = 0;
          //   //Брак
          //   let defected = 0;
          //   //Истек
          //   let expired = 0;
          //Доступный
          let available = 0;
          item.stocks.forEach(el => {
            switch (el.type) {
              case ItemTypes.FIT: {
                fit += el.count;
                break;
              }
              case ItemTypes.AVAILABLE: {
                available += el.count;
                break;
              }
              // case ItemTypes.UTILIZATION: {
              //   utilization += el.count;
              //   break;
              // }
              // case ItemTypes.DEFECT: {
              //   defected += el.count;
              //   break;
              // }
              case ItemTypes.QUARANTINE: {
                quarantine += el.count;
                break;
              }
              // case ItemTypes.EXPIRED: {
              //   expired += el.count;
              //   break;
              // }
            }
          });
          //Резерв
          let reserved = 0;
          if (fit > available) {
            reserved = fit - available;
          }
          result.push({
            itemId: findItem.id,
            warehouseId: findWarehouse.id,
            currentValue: available,
            reserved: reserved,
            promised: quarantine,
            marketplaceId: findMarketplace.id
          });
        }
      }
      for (const item of result) {
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('item_id = :itemId', { itemId: item.itemId })
          .andWhere('warehouse_id = :warehouseId', { warehouseId: item.warehouseId })
          .getOne();
        if (findStock) {
          await queryRunner.manager.update(
            Stocks,
            { id: findStock.id },
            {
              currentValue: item.currentValue,
              reserved: item.reserved,
              promised: item.promised
            }
          );
        } else {
          const createStock = await queryRunner.manager.create(Stocks, {
            itemId: item.itemId,
            warehouseId: item.warehouseId,
            currentValue: item.currentValue,
            reserved: item.reserved,
            promised: item.promised,
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
      }
    } catch (error) {
      this.logger.error('Не смог обновить остатки Yandex');
      this.logger.error(error);
    } finally {
      await queryRunner.release();
    }
  }

  async getOzonStocks(clientId: string, ozonToken: string){
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
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
          { title: stock.warehouse },
          queryRunner
        );
        const findItem = await this.itemsService.findItem(
          { sku: stock.sku, marketplaceId: findMarketplace.id },
          queryRunner
        );
        if (!findItem) {
          await queryRunner.commitTransaction();
          continue;
        }
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('item_id = :itemId', { itemId: findItem.id })
          .andWhere('warehouse_id = :warehouseId', { warehouseId: findWarehouse.id })
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
            warehouseId: findWarehouse.id,
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
    return
  }
}
