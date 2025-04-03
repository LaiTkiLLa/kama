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
        findItem.quantityFull += stock.currentValue
        findItem.inWayToClient += stock.reserved
        findItem.inWayFromClient += stock.promised
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

  @Cron('0 */18 * * * *')
  async getStocks() {
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
          { marketplaceIdentifier: String(stock.nmId) },
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
        const findWarehouse = await this.infoService.findOrCreateWarehouses(
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
    return;
  }
}
