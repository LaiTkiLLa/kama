import { Injectable, Logger } from '@nestjs/common';
import { DataSource, IsNull, Not, QueryRunner } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ItemsService } from '../items/items.service';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { InfoService } from '../info/info.service';
import {
  OwnWarehousesStocksResult,
  OzonOwnWarehousesStocks,
  OzonStocks,
  StocksResult
} from './interfaces/ozon-stocks.interface';
import { Stocks } from './entities/stocks.entity';
import { StocksV2 } from './entities/stocks-v2.entity';
import { GetWbOwnWarehousesStocks, GetWbStocksV2 } from './interfaces/wb-stocks.intrerface';
import { GetCurrentStocksDto } from './dto/get-current-stocks.dto';
import { GetCurrentStocks } from './interfaces/get-current-stocks.interface';
import { GetYandexStocks, ItemTypes } from './interfaces/yandex-stocks.interface';
import { Warehouses } from '../info/entities/warehouses.entity';
import { Marketplaces } from '../info/entities/marketplaces.entity';
import { MarketplaceItems } from '../items/entities/marketplace-items.entity';
import { MarketplaceItemSizes } from '../items/entities/marketplace-item-sizes.entity';
import { GetStocksByWarehousesDto } from './dto/get-stocks-by-warehouses.dto';
import { GetStocksByWarehouses } from './interfaces/get-stocks-by-warehouses.interface';
import { Items } from '../items/entities/items.entity';

@Injectable()
export class StocksService {
  constructor(
    private dataSource: DataSource,
    private itemsService: ItemsService,
    private configService: ConfigService,
    private infoService: InfoService
  ) {}

  private logger: Logger = new Logger(StocksService.name);

  /**
   * Первое появление listing в остатках (qty > 0): marketplace_items.appeared_at.
   * Если у item ещё нет wbCreatedAt — «Новинка / A» на любом МП.
   */
  private async markAppearedOnFirstStock(
    queryRunner: QueryRunner,
    marketplaceItemId: number,
    quantity: number
  ): Promise<void> {
    if (quantity <= 0) {
      return;
    }
    const updateResult = await queryRunner.manager
      .createQueryBuilder()
      .update(MarketplaceItems)
      .set({ appearedAt: new Date() })
      .where('id = :marketplaceItemId', { marketplaceItemId })
      .andWhere('appeared_at IS NULL')
      .execute();
    if (!updateResult.affected) {
      return;
    }
    const mpItem = await queryRunner.manager.findOne(MarketplaceItems, {
      where: { id: marketplaceItemId },
      select: ['id', 'itemId']
    });
    if (!mpItem) {
      return;
    }
    const item = await queryRunner.manager.findOne(Items, {
      where: { id: mpItem.itemId },
      select: ['id', 'wbCreatedAt']
    });
    if (!item || item.wbCreatedAt) {
      return;
    }
    await queryRunner.manager.update(
      Items,
      { id: item.id },
      {
        wbCreatedAt: new Date(),
        classification: 'Новинка / A',
        virality: 'виральный предположительно'
      }
    );
  }

  /**
   * Снимок остатков по размеру МП (stocks_v2) за сегодня.
   * Без строки marketplace_item_sizes — no-op.
   */
  private async upsertStocksV2ByChrtId(
    queryRunner: QueryRunner,
    params: {
      marketplaceId: number;
      warehouseId: number;
      chrtId: number | string;
      marketplaceItemId?: number;
      currentValue: number;
      reserved?: number;
      promised?: number;
    }
  ): Promise<void> {
    const sizeQuery = queryRunner.manager
      .createQueryBuilder(MarketplaceItemSizes, 'sizes')
      .innerJoin('sizes.marketplaceItem', 'mpItem')
      .where('sizes.marketplaceSizeId = :sizeId', { sizeId: String(params.chrtId) })
      .andWhere('sizes.deletedAt IS NULL')
      .andWhere('mpItem.marketplaceId = :marketplaceId', { marketplaceId: params.marketplaceId })
      .andWhere('mpItem.deletedAt IS NULL');
    if (params.marketplaceItemId != null) {
      sizeQuery.andWhere('sizes.marketplaceItemId = :marketplaceItemId', {
        marketplaceItemId: params.marketplaceItemId
      });
    }
    const size = await sizeQuery.getOne();
    if (!size) {
      return;
    }

    const findStock = await queryRunner.manager
      .createQueryBuilder(StocksV2, 'stocksV2')
      .where("DATE(stocksV2.created_at) = DATE('now')")
      .andWhere('stocksV2.marketplaceItemSizeId = :marketplaceItemSizeId', {
        marketplaceItemSizeId: size.id
      })
      .andWhere('stocksV2.warehouseId = :warehouseId', { warehouseId: params.warehouseId })
      .getOne();

    const payload = {
      currentValue: params.currentValue,
      reserved: params.reserved ?? 0,
      promised: params.promised ?? 0
    };

    if (findStock) {
      await queryRunner.manager.update(StocksV2, { id: findStock.id }, payload);
      return;
    }

    const createStock = queryRunner.manager.create(StocksV2, {
      warehouseId: params.warehouseId,
      marketplaceId: params.marketplaceId,
      marketplaceItemSizeId: size.id,
      ...payload
    });
    await queryRunner.manager.save(StocksV2, createStock);
  }

  async getStocks(getCurrentStocksDto: GetCurrentStocksDto, queryRunner: QueryRunner) {
    const queryBuilder = queryRunner.manager
      .createQueryBuilder(MarketplaceItems, 'mpItems')
      .leftJoinAndSelect('mpItems.marketplace', 'marketplace')
      .leftJoinAndSelect('mpItems.item', 'item')
      .leftJoinAndSelect(
        'mpItems.stocks',
        'stocks',
        "stocks.created_at >= CURRENT_DATE AND stocks.created_at < CURRENT_DATE + INTERVAL '1 day'"
      )
      .leftJoinAndSelect('item.itemsSuppliers', 'itemsSuppliers', 'itemsSuppliers.deletedAt IS NULL')
      .leftJoinAndSelect('itemsSuppliers.supplier', 'supplier')
      .leftJoinAndSelect('stocks.warehouse', 'warehouse')
      .where('marketplace.title = :marketplace', { marketplace: getCurrentStocksDto.marketplace })
      // .andWhere('items.isArchive = :isArchive', { isArchive: false })
      .andWhere('mpItems.deletedAt IS NULL')
      .andWhere('item.createdForCalculation = :createdForCalculation', {
        createdForCalculation: false
      });
    if (getCurrentStocksDto?.suppliers?.length) {
      queryBuilder.andWhere('supplier.title IN (:...suppliers)', {
        suppliers: getCurrentStocksDto.suppliers
      });
    }
    if (getCurrentStocksDto?.warehouseType) {
      queryBuilder.andWhere('warehouse.type = :warehouseType', {
        warehouseType: getCurrentStocksDto.warehouseType
      });
    }
    const findItemsWithStocks = await queryBuilder.getMany();
    const excludeWarehouses = [
      18, 1146895, 16, 59, 95, 1146938, 1146932, 1146912, 19, 1147083, 1146906, 242582, 158, 1146879, 67,
      1146902, 1146903, 1146878, 1146919, 1147137, 1147160, 1146898, 1147058, 21, 1146887, 1146888, 1146889,
      383378, 80330, 1146880, 1146881, 22, 1146893, 1146031, 1149375, 43, 12, 14, 331714, 335470, 1147284,
      1147304, 1147356, 1147357, 35, 1147313, 1150862
    ];
    return findItemsWithStocks.map(mpItem => {
      const stocksResult = mpItem.stocks.reduce<{
        quantityFull: number;
        inWayToClient: number;
        inWayFromClient: number;
        ownWarehouses: { title: string; value: number }[];
      }>(
        (stAcc, stock) => {
          if (excludeWarehouses.includes(stock.warehouseId)) {
            return stAcc;
          }
          if (stock.warehouse.type === 'FBS') {
            stAcc.ownWarehouses.push({
              title: stock.warehouse.title,
              value: stock.currentValue
            });
          }
          stAcc.quantityFull += stock.currentValue ?? 0;
          stAcc.inWayToClient += stock.reserved ?? 0;
          stAcc.inWayFromClient += stock.promised ?? 0;
          return stAcc;
        },
        {
          quantityFull: 0,
          inWayToClient: 0,
          inWayFromClient: 0,
          ownWarehouses: []
        }
      );
      return {
        id: mpItem.item.id,
        nmId: Number(mpItem.marketplaceIdentifier),
        supplierArticle: mpItem.item.article,
        barcode: Number(mpItem.barcode),
        inWayToClient: stocksResult.inWayToClient,
        inWayFromClient: stocksResult.inWayFromClient,
        quantityFull: stocksResult.quantityFull,
        sku: mpItem.sku,
        ownWarehouses: stocksResult.ownWarehouses,
        mpItem: mpItem.id,
        title: mpItem.title
      };
    });
  }

  async getCurrentStocksV2(getCurrentStocksDto: GetCurrentStocksDto): Promise<GetCurrentStocks[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      return this.getStocks(getCurrentStocksDto, queryRunner);
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить текущий список остатков');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStocksByWarehouse(
    getStocksByWarehouseDto: GetStocksByWarehousesDto
  ): Promise<GetStocksByWarehouses[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const excludeWarehouses = [
        18, 1146895, 16, 59, 95, 1146938, 1146932, 1146912, 19, 1147083, 1146906, 242582, 158, 1146879, 67,
        1146902, 1146903, 1146878, 1146919, 1147137, 1147160, 1146898, 1147058, 21, 1146887, 1146888, 1146889,
        383378, 80330, 1146880, 1146881
      ];
      const findStocksByWarehouses = await queryRunner.manager
        .createQueryBuilder(MarketplaceItems, 'mpItems')
        .leftJoinAndSelect('mpItems.marketplace', 'marketplace')
        .leftJoinAndSelect('mpItems.item', 'item')
        .leftJoinAndSelect(
          'mpItems.stocks',
          'stocks',
          "stocks.created_at >= CURRENT_DATE AND stocks.created_at < CURRENT_DATE + INTERVAL '1 day'"
        )
        .leftJoinAndSelect('stocks.warehouse', 'warehouse')
        .where('marketplace.title = :marketplace', { marketplace: getStocksByWarehouseDto.marketplace })
        .andWhere('item.isArchive = :isArchive', { isArchive: false })
        .andWhere('mpItems.deletedAt IS NULL')
        .andWhere('item.createdForCalculation = :createdForCalculation', {
          createdForCalculation: false
        })
        .getMany();
      return findStocksByWarehouses.map<GetStocksByWarehouses>(mpItem => {
        return {
          id: mpItem.id,
          itemId: mpItem.item.id,
          article: mpItem.item.article,
          chrtId: Number(mpItem.chrtId ?? 0),
          title: mpItem.title,
          stocks: mpItem.stocks.map(stock => {
            return {
              warehouse: {
                id: stock.warehouse.marketplaceInternalNumber,
                title: stock.warehouse.title,
                type: stock.warehouse.type
              },
              inWayToClient: stock.reserved,
              inWayFromClient: stock.promised,
              quantityFull: excludeWarehouses.includes(stock.warehouse.id) ? 0 : (stock?.currentValue ?? 0)
            };
          })
        };
      });
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить остатки по складам');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */18 * * * *')
  async getWbStocksV2() {
    const apiToken = this.configService.get<string>('wbToken');
    if (!apiToken) {
      this.logger.error('Не найден Апи токен для получения остатков WB');
      return;
    }
    const urlStocks =
      'https://seller-analytics-api.wildberries.ru/api/analytics/v1/stocks-report/wb-warehouses';
    const { data }: { data: GetWbStocksV2 } = await axios.post(
      urlStocks,
      { limit: 250000, offset: 0 },
      {
        headers: {
          Authorization: apiToken
        }
      }
    );
    const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    if (!findMarketplace) {
      this.logger.error('WB не найден среди МП. Не удалось получить остатки');
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const stock of data.data.items) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: String(stock.warehouseId), marketplaceId: findMarketplace.id }
        });
        if (!findWarehouse) {
          continue;
        }
        const findMarketplaceItem = await queryRunner.manager
          .createQueryBuilder(MarketplaceItems, 'mpItems')
          .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
          .andWhere('mpItems.marketplaceIdentifier = :marketplaceIdentifier', {
            marketplaceIdentifier: String(stock.nmId)
          })
          .getOne();
        if (!findMarketplaceItem) {
          continue;
        }
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('stocks.marketplaceItemId = :marketplaceItemId', {
            marketplaceItemId: findMarketplaceItem.id
          })
          .andWhere('stocks.warehouseId = :warehouseId', { warehouseId: findWarehouse.id })
          .getOne();
        if (findStock) {
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.quantity);
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
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.quantity);
          const createStock = queryRunner.manager.create(Stocks, {
            warehouseId: findWarehouse.id,
            currentValue: stock.quantity,
            reserved: stock.inWayToClient,
            promised: stock.inWayFromClient,
            marketplaceId: findMarketplace.id,
            marketplaceItemId: findMarketplaceItem.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
        await this.upsertStocksV2ByChrtId(queryRunner, {
          marketplaceId: findMarketplace.id,
          warehouseId: findWarehouse.id,
          chrtId: stock.chrtId,
          marketplaceItemId: findMarketplaceItem.id,
          currentValue: stock.quantity,
          reserved: stock.inWayToClient,
          promised: stock.inWayFromClient
        });
      }
    } catch {
      this.logger.error('Не смог получить список остатков WB');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */28 * * * *')
  async getWbOwnWarehousesStocks() {
    const apiToken = this.configService.get<string>('wbToken');
    if (!apiToken) {
      return;
    }
    const urlStocks = 'https://marketplace-api.wildberries.ru/api/v3/stocks';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findMarketplace = await queryRunner.manager.findOne(Marketplaces, { where: { title: 'WB' } });
      if (!findMarketplace) {
        return;
      }
      const findOwnWarehouses = await queryRunner.manager.find(Warehouses, {
        where: {
          type: 'FBS',
          marketplaceId: findMarketplace.id
        }
      });
      if (!findOwnWarehouses.length) {
        return;
      }
      const findWbItems = await queryRunner.manager.find(MarketplaceItems, {
        where: {
          deletedAt: IsNull(),
          chrtId: Not(IsNull()),
          marketplaceId: findMarketplace.id
        }
      });
      const findWbSizes = await queryRunner.manager
        .createQueryBuilder(MarketplaceItemSizes, 'sizes')
        .innerJoin('sizes.marketplaceItem', 'mpItem')
        .where('mpItem.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
        .andWhere('mpItem.deletedAt IS NULL')
        .andWhere('sizes.deletedAt IS NULL')
        .getMany();
      const sizeChrtIds = [
        ...new Set(findWbSizes.map(size => Number(size.marketplaceSizeId)).filter(id => !Number.isNaN(id)))
      ];
      const resultStocks: {
        warehouseId: string;
        sku: string;
        chrtId: number;
        amount: number;
      }[] = [];
      for (const warehouse of findOwnWarehouses) {
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const chrtIdsForRequest = sizeChrtIds.length
            ? sizeChrtIds
            : findWbItems.map(item => Number(item.chrtId));
          const { data }: { data: GetWbOwnWarehousesStocks } = await axios.post(
            `${urlStocks}/${warehouse.marketplaceInternalNumber}`,
            {
              chrtIds: chrtIdsForRequest
            },
            {
              headers: {
                Authorization: apiToken
              }
            }
          );

          const stocksMap = new Map(data.stocks.map(stock => [Number(stock.chrtId), stock]));

          for (const item of findWbItems) {
            const stock = stocksMap.get(Number(item.chrtId));

            resultStocks.push({
              warehouseId: warehouse.marketplaceInternalNumber,
              sku: item.barcode,
              chrtId: Number(item.chrtId),
              amount: stock?.amount ?? 0
            });
          }

          for (const size of findWbSizes) {
            const sizeStock = stocksMap.get(Number(size.marketplaceSizeId));
            await this.upsertStocksV2ByChrtId(queryRunner, {
              marketplaceId: findMarketplace.id,
              warehouseId: warehouse.id,
              chrtId: size.marketplaceSizeId,
              marketplaceItemId: size.marketplaceItemId,
              currentValue: sizeStock?.amount ?? 0
            });
          }
        } catch (error) {
          if (error instanceof AxiosError) {
            this.logger.error(
              `Ошибка получения остатков WB. Склад: ${warehouse.marketplaceInternalNumber}, status: ${error.response?.status}`
            );

            this.logger.error(error.response?.data);
          } else {
            this.logger.error(error);
          }
          continue;
        }
      }
      for (const warehouse of resultStocks) {
        const findWarehouse = findOwnWarehouses.find(
          el => el.marketplaceInternalNumber === warehouse.warehouseId
        );
        if (!findWarehouse) {
          continue;
        }
        try {
          const findMarketplaceItem = await queryRunner.manager
            .createQueryBuilder(MarketplaceItems, 'mpItems')
            .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
            .andWhere('mpItems.barcode = :barcode', {
              barcode: String(warehouse.sku)
            })
            .getOne();
          if (!findMarketplaceItem) {
            continue;
          }
          const findStock = await queryRunner.manager
            .createQueryBuilder(Stocks, 'stocks')
            .where("DATE(created_at) = DATE('now')")
            .andWhere('stocks.marketplaceItemId = :marketplaceItemId', {
              marketplaceItemId: findMarketplaceItem.id
            })
            .andWhere('stocks.warehouseId = :warehouseId', { warehouseId: findWarehouse.id })
            .getOne();
          if (findStock) {
            await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, warehouse.amount);
            await queryRunner.manager.update(
              Stocks,
              { id: findStock.id },
              {
                currentValue: warehouse.amount
              }
            );
          } else {
            await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, warehouse.amount);
            const createStock = queryRunner.manager.create(Stocks, {
              warehouseId: findWarehouse.id,
              currentValue: warehouse.amount,
              marketplaceId: findMarketplace.id,
              marketplaceItemId: findMarketplaceItem.id
            });
            await queryRunner.manager.save(Stocks, createStock);
          }
        } catch (error) {
          this.logger.error(error);
          this.logger.error('Не смог скачать остатки WB собственного склада');
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */25 * * * *')
  async getOzonStocksFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken) return;
    if (!clientId) return;
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOzonStocks(clientId, ozonToken, findMarketplace.id);
    return;
  }

  @Cron('0 */27 * * * *')
  async getOzonStocksSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken) return;
    if (!clientId) return;
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Tamov' });
    await this.getOzonStocks(clientId, ozonToken, findMarketplace.id);
    return;
  }

  @Cron('0 */29 * * * *')
  async getOzonOwnStocksFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken) return;
    if (!clientId) return;
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOzonOwnStocks(clientId, ozonToken, findMarketplace.id);
    return;
  }

  @Cron('0 */31 * * * *')
  async getOzonOwnStocksSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken) return;
    if (!clientId) return;
    const findMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Tamov' });
    await this.getOzonOwnStocks(clientId, ozonToken, findMarketplace.id);
    return;
  }

  @Cron('0 */22 * * * *')
  async getYandexStocksFirst() {
    const clientId = this.configService.get<string>('yandexClientId');
    const apiKey = this.configService.get<string>('yandexToken');
    if (!clientId) return;
    if (!apiKey) return;
    await this.getYandexStocks(clientId, apiKey, 'Yandex');
    return;
  }

  @Cron('0 */23 * * * *')
  async getYandexStocksSecond() {
    const clientId = this.configService.get<string>('yandexTamovCLientId');
    const apiKey = this.configService.get<string>('yandexTamovToken');
    if (!clientId) return;
    if (!apiKey) return;
    await this.getYandexStocks(clientId, apiKey, 'Yandex Tamov');
    return;
  }

  async getYandexStocks(clientId: string, apiKey: string, mpTitle: string) {
    let hasMoreData = true;
    const stocks: {
      warehouseId: number;
      items: {
        supplierArticle: string;
        stocks: { type: ItemTypes; count: number }[];
      }[];
    }[] = [];

    let pageToken;

    while (hasMoreData) {
      let urlStocks = `https://api.partner.market.yandex.ru/campaigns/${clientId}/offers/stocks?limit=200`;
      if (pageToken) {
        urlStocks = `https://api.partner.market.yandex.ru/campaigns/${clientId}/offers/stocks?limit=200&page_token=${pageToken}`;
      }
      const { data }: { data: GetYandexStocks } = await axios.post(
        urlStocks,
        {
          withTurnover: true
        },
        {
          headers: {
            'Api-Key': apiKey
          }
        }
      );
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
      if (data.result.paging?.nextPageToken) {
        pageToken = data.result.paging.nextPageToken;
      } else {
        hasMoreData = false;
      }
    }

    const findMarketplace = await this.infoService.findMarketplace({ title: mpTitle });
    const result: {
      warehouseId: number;
      currentValue: number;
      reserved: number;
      promised: number;
      marketplaceId: number;
      marketplaceItemId: number;
    }[] = [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const stock of stocks) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: {
            marketplaceInternalNumber: String(stock.warehouseId),
            marketplaceId: findMarketplace.id
          }
        });
        if (!findWarehouse) {
          continue;
        }
        for (const item of stock.items) {
          const findMarketplaceItem = await queryRunner.manager
            .createQueryBuilder(MarketplaceItems, 'mpItems')
            .leftJoinAndSelect('mpItems.item', 'item')
            .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId: findMarketplace.id })
            .andWhere('item.article = :article', {
              article: item.supplierArticle
            })
            .getOne();
          if (!findMarketplaceItem) {
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
            warehouseId: findWarehouse.id,
            currentValue: available,
            reserved: reserved,
            promised: quarantine,
            marketplaceId: findMarketplace.id,
            marketplaceItemId: findMarketplaceItem.id
          });
        }
      }
      for (const item of result) {
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('stocks.marketplaceItemId = :marketplaceItemId', {
            marketplaceItemId: item.marketplaceItemId
          })
          .andWhere('stocks.warehouseId = :warehouseId', { warehouseId: item.warehouseId })
          .getOne();
        if (findStock) {
          await this.markAppearedOnFirstStock(queryRunner, item.marketplaceItemId, item.currentValue);
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
          await this.markAppearedOnFirstStock(queryRunner, item.marketplaceItemId, item.currentValue);
          const createStock = queryRunner.manager.create(Stocks, {
            warehouseId: item.warehouseId,
            currentValue: item.currentValue,
            reserved: item.reserved,
            promised: item.promised,
            marketplaceId: findMarketplace.id,
            marketplaceItemId: item.marketplaceItemId
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

  async getOzonOwnStocks(clientId: string, ozonToken: string, marketplaceId: number) {
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const urlStocks = 'https://api-seller.ozon.ru/v1/product/info/warehouse/stocks';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findOwnWarehouses = await queryRunner.manager.find(Warehouses, {
        where: {
          type: 'FBS',
          marketplaceId
        }
      });
      const warehousesMap = new Map<string, number>(
        findOwnWarehouses.map(warehouse => [warehouse.marketplaceInternalNumber, warehouse.id])
      );
      const stocks: OwnWarehousesStocksResult[] = [];
      for (const warehouse of findOwnWarehouses) {
        let hasMoreData = true;
        let cursor = '';
        while (hasMoreData) {
          const { data }: { data: OzonOwnWarehousesStocks } = await axios.post(
            urlStocks,
            {
              limit: 1000,
              cursor,
              warehouse_id: Number(warehouse.marketplaceInternalNumber)
            },
            { headers }
          );

          for (const item of data.stocks ?? []) {
            stocks.push({
              article: item.offer_id,
              sku: String(item.sku),
              reserved: item.reserved,
              current: item.free_stock,
              promised: 0,
              warehouse: String(item.warehouse_id)
            });
          }
          if (!data.has_next) {
            hasMoreData = false;
          } else {
            cursor = data.cursor;
          }
        }
      }
      for (const stock of stocks) {
        const findWarehouseId = warehousesMap.get(stock.warehouse);
        if (!findWarehouseId) continue;
        const findMarketplaceItem = await queryRunner.manager
          .createQueryBuilder(MarketplaceItems, 'mpItems')
          .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId })
          .andWhere('mpItems.sku = :sku', {
            sku: stock.sku
          })
          .getOne();
        if (!findMarketplaceItem) {
          continue;
        }
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('stocks.marketplaceItemId = :marketplaceItemId', {
            marketplaceItemId: findMarketplaceItem.id
          })
          .andWhere('stocks.warehouseId = :warehouseId', { warehouseId: findWarehouseId })
          .getOne();
        if (findStock) {
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.current);
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
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.current);
          const createStock = queryRunner.manager.create(Stocks, {
            warehouseId: findWarehouseId,
            currentValue: stock.current,
            reserved: stock.reserved,
            promised: stock.promised,
            marketplaceId,
            marketplaceItemId: findMarketplaceItem.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
      }
    } catch (error) {
      this.logger.error('Не смог обновить остатки FBS Ozon');
      this.logger.error(error);
    } finally {
      await queryRunner.release();
    }
  }

  async getOzonStocks(clientId: string, ozonToken: string, marketplaceId: number) {
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const stock of stocks) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: {
            title: stock.warehouse,
            marketplaceId
          }
        });
        if (!findWarehouse) {
          continue;
        }
        const findMarketplaceItem = await queryRunner.manager
          .createQueryBuilder(MarketplaceItems, 'mpItems')
          .where('mpItems.marketplaceId = :marketplaceId', { marketplaceId })
          .andWhere('mpItems.sku = :sku', {
            sku: stock.sku
          })
          .getOne();
        if (!findMarketplaceItem) {
          continue;
        }
        const findStock = await queryRunner.manager
          .createQueryBuilder(Stocks, 'stocks')
          .where("DATE(created_at) = DATE('now')")
          .andWhere('stocks.marketplaceItemId = :marketplaceItemId', {
            marketplaceItemId: findMarketplaceItem.id
          })
          .andWhere('stocks.warehouseId = :warehouseId', { warehouseId: findWarehouse.id })
          .getOne();
        if (findStock) {
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.current);
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
          await this.markAppearedOnFirstStock(queryRunner, findMarketplaceItem.id, stock.current);
          const createStock = queryRunner.manager.create(Stocks, {
            warehouseId: findWarehouse.id,
            currentValue: stock.current,
            reserved: stock.reserved,
            promised: stock.promised,
            marketplaceId,
            marketplaceItemId: findMarketplaceItem.id
          });
          await queryRunner.manager.save(Stocks, createStock);
        }
      }
    } catch (error) {
      this.logger.error('Не смог обновить остатки Ozon');
      this.logger.error(error);
    } finally {
      await queryRunner.release();
    }
    return;
  }
}
