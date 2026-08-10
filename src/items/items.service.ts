import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, In, IsNull } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { Items } from './entities/items.entity';
import { WbItem, WbItems, WbItemsPrices, WbTrashedItems } from './interfaces/wb-items.interface';
import { YandexItems, YandexItemsResult } from './interfaces/yandex-items.interface';
import { GetStopListFromDbV2, StopListCronResult, StopListResponse } from './interfaces/stop-list.interface';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { StatusesTypes } from '../info/enum/statuses.enum';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { Suppliers } from '../info/entities/suppliers.entity';
import { OzonCategoryData, OzonItemsInfo, OzonItemsPrices } from './interfaces/ozon-items-info.interface';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';
import { ItemsSuppliers } from './entities/items_suppliers.entity';
import { MarketplaceItems } from './entities/marketplace-items.entity';
import { MarketplaceInfo } from './interfaces/get-items-directory-list.interface';
import { Statuses } from 'src/info/entities/statuses.entity';

@Injectable()
export class ItemsService {
  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(ItemsService.name);

  async createTestItem() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const findWbMp = await this.infoService.findMarketplace({ title: 'WB' });
      const createItem = queryRunner.manager.create(Items, {
        createdForCalculation: true,
        article: 'тестовый артикул'
      });
      await queryRunner.manager.save(Items, createItem);
      await queryRunner.manager.update(
        Items,
        { id: createItem.id },
        {
          article: `тестовый артикул ${createItem.id}`
        }
      );
      const createMarketplaceItem = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findWbMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id}`,
        sku: `тестовый ску ${createItem.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItem);
      await queryRunner.commitTransaction();
      return { id: createItem.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не добавить тестовый товар');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getItemsDirectoryList(getDirectoryListDto: GetDirectoryListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .leftJoinAndSelect('items.marketplaceItems', 'marketplaceItems', 'marketplaceItems.deletedAt IS NULL')
        .leftJoinAndSelect('marketplaceItems.marketplace', 'marketplaceV2')
        .leftJoinAndSelect('items.itemsSuppliers', 'itemsSuppliers')
        .leftJoinAndSelect('itemsSuppliers.supplier', 'supplier')
        .where('items.isArchive = :isArchive', { isArchive: false });
      if (getDirectoryListDto.supplierTitle) {
        queryBuilder.andWhere('supplier.title = :supplierTitle', {
          supplierTitle: getDirectoryListDto.supplierTitle
        });
      }
      if (getDirectoryListDto.withTestArticles === false) {
        queryBuilder.andWhere('items.createdForCalculation = :createdForCalculation', {
          createdForCalculation: false
        });
      }
      const findItems = await queryBuilder.orderBy('items.id', 'ASC').getMany();
      const filterWbItems = findItems.map(item => {
        return {
          id: item.id,
          article: item.article,
          ownCategory: item.ownCategory,
          supplierTitle: item.itemsSuppliers.length ? item.itemsSuppliers[0].supplier.title : null,
          articleOld: item.articleOld,
          classification: item.classification,
          multiplicity: item.multiplicity,
          boxNumber: item.boxNumber,
          dimensionsFact: item.dimensionsFact,
          volume: item.volume,
          wbCreatedAt: item.wbCreatedAt,
          costInYuan: item.costInYuan,
          costInRub: item.costInRub,
          replenishmentPeriod: item.replenishmentPeriod,
          remainingBalance: item.remainingBalance,
          ownImagesUrl: item.ownImagesUrl,
          volumePerUnit: item.volumePerUnit,
          weightPerUnit: item.weightPerUnit,
          transportRateUsd: item.transportRateUsd,
          dutyPercentage: item.dutyPercentage,
          density: item.density,
          tariffWeight: item.tariffWeight,
          createdForCalculation: item.createdForCalculation,
          costInYuanWhite: item.costInYuanWhite,
          codeTNVED: item.codeTNVED,
          dimensionsMasterBox: item.dimensionsMasterBox,
          volumeMasterBox: item.volumeMasterBox,
          consolidation: item.consolidation,
          payment: item.payment,
          assembling: item.assembling,
          fullfillmentAcceptance: item.fullfillmentAcceptance,
          marketplaceAcceptance: item.marketplaceAcceptance,
          production: item.production,
          buffer: item.buffer,
          daysDeliveryToRussia: item.daysDeliveryToRussia,
          supplierMinimumOrder: item.supplierMinimumOrder,
          virality: item.virality,
          costCalculationType: item.costCalculationType,
          calculationType: item.calculationType,
          downloadCalculationMethod: item.downloadCalculationMethod,
          wbSizes: item?.sizes?.map(el => el.techSize) ?? [],
          marketplacesInfo: [] as MarketplaceInfo[]
        };
      });
      for (const item of findItems) {
        const findItem = filterWbItems.find(wbItem => wbItem.article === item.article);
        if (findItem) {
          findItem.marketplacesInfo.push(
            ...item.marketplaceItems.map(el => ({
              title: el.marketplace.title,
              dimensions: el.dimensions,
              volume: Number(el.volume).toFixed(2),
              sku: el.sku,
              marketplaceIdentifier: el.marketplaceIdentifier,
              category: el.category,
              barcode: el.barcode,
              image: el.imageUrl,
              color: el.color,
              itemTitle: el.title,
              price: el.price,
              discount: el.discount,
              priceWithDiscount: el.priceWithDiscount
            }))
          );
        }
      }
      return filterWbItems;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить справочник товаров');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateArrayDirectoryItemsInfoV2(updateArrayDirectoryItemsInfoDto: UpdateArrayDirectoryItemsInfoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of updateArrayDirectoryItemsInfoDto.items) {
        const findItem = await queryRunner.manager
          .createQueryBuilder(Items, 'items')
          .leftJoinAndSelect('items.marketplaceItems', 'mpItems', 'mpItems.deletedAt IS NULL')
          .leftJoinAndSelect('mpItems.marketplace', 'marketplace')
          .where('items.article = :article', { article: item.article })
          .getOne();

        if (!findItem) {
          throw new NotFoundException('Артикул не найден');
        }
        if (item.supplier) {
          const findSupplier = await queryRunner.manager.findOne(Suppliers, {
            where: {
              title: item.supplier
            }
          });
          if (!findSupplier) {
            throw new NotFoundException('Поставщик не найден');
          }
          const findItemsSupplier = await queryRunner.manager.find(ItemsSuppliers, {
            where: {
              itemId: findItem.id
            }
          });
          if (findItemsSupplier.length) {
            await queryRunner.manager.update(
              ItemsSuppliers,
              { itemId: findItem.id },
              { supplierId: findSupplier.id }
            );
          } else {
            await queryRunner.manager.insert(ItemsSuppliers, {
              supplierId: findSupplier.id,
              itemId: findItem.id
            });
          }
        }
        await queryRunner.manager.update(
          Items,
          { id: findItem.id },
          {
            ownCategory: item.ownCategory,
            classification: item.classification,
            multiplicity: item.multiplicity,
            boxNumber: item.boxNumber,
            dimensionsFact: item.dimensionsFact,
            volume: item.volume,
            articleOld: item.articleOld,
            costInYuan: item.costInYuan,
            costInRub: item.costInRub,
            replenishmentPeriod: item.replenishmentPeriod,
            remainingBalance: item.remainingBalance,
            ownImagesUrl: item.ownImagesUrl,
            volumePerUnit: item.volumePerUnit,
            weightPerUnit: item.weightPerUnit,
            transportRateUsd: item.transportRateUsd,
            dutyPercentage: item.dutyPercentage,
            tariffWeight: item.tariffWeight,
            costInYuanWhite: item.costInYuanWhite,
            codeTNVED: item.codeTNVED,
            dimensionsMasterBox: item.dimensionsMasterBox,
            consolidation: item.consolidation,
            payment: item.payment,
            assembling: item.assembling,
            fullfillmentAcceptance: item.fullfillmentAcceptance,
            marketplaceAcceptance: item.marketplaceAcceptance,
            production: item.production,
            buffer: item.buffer,
            daysDeliveryToRussia: item.daysDeliveryToRussia,
            supplierMinimumOrder: item.supplierMinimumOrder,
            virality: item.virality,
            costCalculationType: item.costCalculationType,
            calculationType: item.calculationType,
            downloadCalculationMethod: item.downloadCalculationMethod
          }
        );
        for (const mpItem of findItem.marketplaceItems) {
          if (mpItem.marketplace.title === 'WB') {
            await queryRunner.manager.update(
              MarketplaceItems,
              { id: mpItem.id },
              {
                category: item.category,
                volume: findItem.createdForCalculation ? item.volumeWB : undefined,
                title: findItem.createdForCalculation ? item.title : undefined
              }
            );
          } else if (mpItem.marketplace.title === 'Озон') {
            await queryRunner.manager.update(
              MarketplaceItems,
              { id: mpItem.id },
              {
                category: item.category,
                volume: findItem.createdForCalculation ? item.volumeOzon : undefined,
                title: findItem.createdForCalculation ? item.title : undefined
              }
            );
          } else if (mpItem.marketplace.title === 'Yandex') {
            await queryRunner.manager.update(
              MarketplaceItems,
              { id: mpItem.id },
              { category: item.category, title: findItem.createdForCalculation ? item.title : undefined }
            );
          }
        }
      }
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог обновить справочник товаров');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getItemStopsListV2(getItemsStopListDto: GetItemsStopListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(MarketplaceItems, 'mpItems')
        .select([
          'mpItems.id AS "id"',
          'item.article AS article',
          'mpItems.imageUrl AS "imageUrl"',
          'mpItems.title AS title',
          'mpItems.color AS color',
          'mpItems.barcode AS barcode',
          'mpItems.marketplaceIdentifier AS "marketplaceIdentifier"',
          'mpItems.sku AS sku',

          'marketplace.id AS "marketplaceId"',
          'marketplace.title AS "marketplaceTitle"',

          'sendStatus.id AS "sendStatusId"',
          'sendStatus.title AS "sendStatusTitle"'
        ])
        .innerJoin('mpItems.item', 'item')
        .innerJoin('mpItems.marketplace', 'marketplace')
        .leftJoin('mpItems.sendStatus', 'sendStatus')
        .leftJoin(
          qb => {
            return (
              qb
                .select('stock.marketplace_item_id', 'marketplace_item_id')
                .addSelect(
                  `SUM(CASE WHEN stock.warehouse_id IN (18, 1146895, 16, 59, 95, 1146938, 1146932, 1147083, 19, 1146912, 1146906, 242582, 158, 67, 1146879, 1146902, 1146903, 1146878, 1146919, 1147137, 1147160, 1146898, 1147058, 211146887, 1146888, 1146889, 383378) THEN 0 ELSE stock.current_value END)`,
                  'stocks_sum'
                )
                // .addSelect('SUM(stock.current_value)', 'stocks_sum')
                .from('stocks', 'stock')
                .where('stock.created_at >= CURRENT_DATE')
                .andWhere("stock.created_at < CURRENT_DATE + INTERVAL '1 day'")
                .groupBy('stock.marketplace_item_id')
            );
          },
          'stocks_summary',
          'stocks_summary.marketplace_item_id = mpItems.id'
        )
        .leftJoin(
          qb => {
            return qb
              .select('ord.marketplace_item_id', 'marketplace_item_id')
              .addSelect('SUM(ord.quantity)', 'orders_sum')
              .from('orders_v2', 'ord')
              .where(`ord.created_at >= :weekAgo`, { weekAgo })
              .groupBy('ord.marketplace_item_id');
          },
          'orders_summary',
          'orders_summary.marketplace_item_id = mpItems.id'
        )

        .addSelect([
          'COALESCE(stocks_summary.stocks_sum, 0) AS "stocksSum"',
          'COALESCE(orders_summary.orders_sum, 0) AS "ordersSum"'
        ]);
      if (getItemsStopListDto.marketplaceTitle) {
        queryBuilder.andWhere('marketplace.title = :marketplaceTitle', {
          marketplaceTitle: getItemsStopListDto.marketplaceTitle
        });
      }
      if (getItemsStopListDto.withActiveStatus) {
        queryBuilder.andWhere('sendStatus.title IN (:...activeStatuses)', {
          activeStatuses: ['Новинка', 'Bestseller']
        });
      }
      const result: GetStopListFromDbV2[] = await queryBuilder
        .andWhere('item.createdForCalculation = :createdForCalculation', { createdForCalculation: false })
        .andWhere('mpItems.deletedAt IS NULL')
        // .andWhere('items.isArchive = :isArchive', { isArchive: false })
        .getRawMany();

      const mappedItems: StopListResponse[] = [];
      for (const item of result) {
        const findArticle = mappedItems.find(el => el.article === item.article);
        // const raw = result.raw[index];
        const wbBarcode = item.marketplaceTitle === 'WB' ? item.barcode : undefined;
        const wbIdentifier = item.marketplaceTitle === 'WB' ? item.marketplaceIdentifier : undefined;
        const ozonIdentifier = item.marketplaceTitle === 'Озон' ? item.sku : undefined;
        if (findArticle) {
          if (wbBarcode) {
            findArticle.wbBarcode = wbBarcode;
          }
          if (wbIdentifier) {
            findArticle.wbIdentifier = wbIdentifier;
          }
          if (ozonIdentifier) {
            findArticle.ozonIdentifier = ozonIdentifier;
          }
          findArticle.marketplace.push({
            id: item.marketplaceId,
            title: item.marketplaceTitle,
            itemId: item.id,
            orders: Number(item.ordersSum),
            stocks: Number(item.stocksSum),
            sendStatus: {
              id: item.sendStatusId,
              title: item.sendStatusTitle
            }
          });
        } else {
          mappedItems.push({
            article: item.article,
            image: item.imageUrl,
            title: item.title,
            color: item.color,
            wbBarcode: wbBarcode ? wbBarcode : null,
            wbIdentifier: wbIdentifier ? wbIdentifier : null,
            ozonIdentifier: ozonIdentifier ? ozonIdentifier : null,
            marketplace: [
              {
                id: item.marketplaceId,
                title: item.marketplaceTitle,
                itemId: item.id,
                orders: Number(item.ordersSum),
                stocks: Number(item.stocksSum),
                sendStatus: {
                  id: item.sendStatusId,
                  title: item.sendStatusTitle
                }
              }
            ]
          });
        }
      }
      return mappedItems;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список стоп листа');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateItemsStopList(updateStopListItems: UpdateStopListItems) {
    const items = updateStopListItems.items.map(item => {
      let wbStatus: string | undefined = undefined;
      let ozonStatus: string | undefined = undefined;
      let yandexStatus: string | undefined = undefined;
      item.statuses.forEach(status => {
        if (status.marketplace === 'WB') {
          wbStatus = status.status;
        }
        if (status.marketplace === 'Озон') {
          ozonStatus = status.status;
        }
        if (status.marketplace === 'Yandex') {
          yandexStatus = status.status;
        }
      });
      return {
        article: item.itemArticle,
        wbStatus,
        yandexStatus,
        ozonStatus
      };
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const item of items) {
        const findItem = await queryRunner.manager
          .createQueryBuilder(Items, 'items')
          .leftJoinAndSelect(
            'items.marketplaceItems',
            'marketplaceItems',
            'marketplaceItems.deletedAt IS NULL'
          )
          .leftJoinAndSelect('marketplaceItems.marketplace', 'marketplace')
          .andWhere('items.article = :article', { article: item.article })
          .getOne();
        const findOzonItem = findItem?.marketplaceItems.find(el => el.marketplace.title === 'Озон');
        const findWbItem = findItem?.marketplaceItems.find(el => el.marketplace.title === 'WB');
        const findYandexItem = findItem?.marketplaceItems.find(el => el.marketplace.title === 'Yandex');
        if (item.ozonStatus && findOzonItem) {
          const findStatusOzon = await queryRunner.manager.findOne(Statuses, {
            where: {
              title: item.ozonStatus,
              type: StatusesTypes.Отправка
            }
          });
          if (findStatusOzon) {
            await queryRunner.manager.update(MarketplaceItems, findOzonItem.id, {
              sendStatusId: findStatusOzon.id
            });
          }
        }
        if (item.wbStatus && findWbItem) {
          const findStatusWB = await queryRunner.manager.findOne(Statuses, {
            where: {
              title: item.wbStatus,
              type: StatusesTypes.Отправка
            }
          });
          if (findStatusWB) {
            await queryRunner.manager.update(MarketplaceItems, findWbItem.id, {
              sendStatusId: findStatusWB.id
            });
          }
        }
        if (item.yandexStatus && findYandexItem) {
          const findStatusYandex = await queryRunner.manager.findOne(Statuses, {
            where: {
              title: item.yandexStatus,
              type: StatusesTypes.Отправка
            }
          });
          if (findStatusYandex) {
            await queryRunner.manager.update(MarketplaceItems, findYandexItem.id, {
              sendStatusId: findStatusYandex.id
            });
          }
        }
      }
      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не смог изменить товар в стоп листе');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */40 * * * *')
  async getWbItems() {
    const itemsUrl = 'https://content-api.wildberries.ru/content/v2/get/cards/list';
    const apiToken = this.configService.get<string>('wbToken');
    let hasMoreData = true;
    let cursor: { limit: number } | { limit: number; nmID: number; updatedAt: string } = {
      limit: 100
    };
    const items: WbItem[] = [];
    while (hasMoreData) {
      const { data }: { data: WbItems } = await axios.post(
        itemsUrl,
        {
          settings: {
            cursor,
            filter: {
              withPhoto: -1
            }
          }
        },
        {
          headers: {
            Authorization: apiToken
          }
        }
      );
      if (!data.cards.length) {
        hasMoreData = false;
      } else {
        items.push(...data.cards);
      }
      cursor = {
        limit: 100,
        updatedAt: data.cursor.updatedAt,
        nmID: data.cursor.nmID
      };
    }
    const wbMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of items) {
        const findColor = item?.characteristics?.find(el => el.name === 'Цвет');
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: { marketplaceIdentifier: String(item.nmID), marketplaceId: wbMarketplace.id }
          // relations: {
          //   sizes: true
          // }
        });
        const volumeWB = (
          (item.dimensions.length * item.dimensions.width * item.dimensions.height) /
          1000
        ).toFixed(2);

        if (!findMpItem) {
          const findItem = await queryRunner.manager.findOne(Items, {
            where: {
              article: item.vendorCode
            }
          });
          let itemId: number;
          if (findItem) {
            itemId = findItem.id;
          } else {
            const createItem = queryRunner.manager.create(Items, {
              article: item.vendorCode
            });
            await queryRunner.manager.save(Items, createItem);
            itemId = createItem.id;
          }

          const createMarketplaceItem = queryRunner.manager.create(MarketplaceItems, {
            itemId,
            marketplaceIdentifier: String(item.nmID),
            barcode: item?.sizes[0]?.skus[0] ?? '0',
            sku: '0',
            marketplaceId: wbMarketplace.id,
            //Размеры в см, вес в кг
            dimensions: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`,
            volume: volumeWB,
            chrtId: String(item?.sizes[0]?.chrtID),
            category: item.subjectName,
            title: item.title,
            imageUrl: item.photos ? item.photos[0].big : null,
            color: findColor ? findColor.value[0] : ''
          });
          await queryRunner.manager.save(MarketplaceItems, createMarketplaceItem);
          // if (item?.sizes?.length) {
          //   for (const size of item.sizes) {
          //     if (size.techSize === '0') continue;
          //     const createSize = queryRunner.manager.create(ItemsSizes, {
          //       itemId: createItem.id,
          //       chrtId: String(size.chrtID),
          //       techSize: size.techSize,
          //       wbSize: size.wbSize
          //     });
          //     await queryRunner.manager.save(ItemsSizes, createSize);
          //   }
          // }
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findMpItem.itemId },
            {
              article: item.vendorCode
            }
          );
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: findMpItem.id },
            {
              barcode: item?.sizes[0]?.skus[0] ?? '0',
              sku: '0',
              //Размеры в см, вес в кг
              dimensions: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`,
              volume: volumeWB,
              chrtId: String(item?.sizes[0]?.chrtID),
              category: item.subjectName,
              title: item.title,
              color: findColor ? findColor.value[0] : '',
              imageUrl: item.photos ? item.photos[0].big : null
            }
          );
          // if (item?.sizes?.length) {
          //   for (const size of item.sizes) {
          //     if (size.techSize === '0') continue;
          //     const findCurrentSize = findItem.sizes.find(el => el.chrtId === String(size.chrtID));
          //     if (findCurrentSize) {
          //       await queryRunner.manager.update(ItemsSizes, findCurrentSize.id, {
          //         chrtId: String(size.chrtID),
          //         techSize: size.techSize,
          //         wbSize: size.wbSize
          //       });
          //     } else {
          //       const createSize = queryRunner.manager.create(ItemsSizes, {
          //         itemId: findItem.id,
          //         chrtId: String(size.chrtID),
          //         techSize: size.techSize,
          //         wbSize: size.wbSize
          //       });
          //       await queryRunner.manager.save(ItemsSizes, createSize);
          //     }
          //   }
          // }
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не удалось скачать товар WB');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */49 * * * *')
  async getWbTrashItems() {
    const itemsUrl = 'https://content-api.wildberries.ru/content/v2/get/cards/trash';
    const apiToken = this.configService.get<string>('wbToken');
    let hasMoreData = true;
    let cursor: { limit: number } | { limit: number; nmID: number; trashedAt: string } = {
      limit: 100
    };
    const items: WbItem[] = [];
    while (hasMoreData) {
      const { data }: { data: WbTrashedItems } = await axios.post(
        itemsUrl,
        {
          settings: {
            cursor,
            filter: {
              withPhoto: -1
            }
          }
        },
        {
          headers: {
            Authorization: apiToken
          }
        }
      );
      if (!data.cards.length) {
        hasMoreData = false;
      } else {
        items.push(...data.cards);
      }
      cursor = {
        limit: 100,
        trashedAt: data.cursor.trashedAt,
        nmID: data.cursor.nmID
      };
    }
    const wbMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of items) {
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: {
            marketplaceIdentifier: String(item.nmID),
            marketplaceId: wbMarketplace.id,
            deletedAt: IsNull()
          }
        });
        if (findMpItem) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: findMpItem.id },
            {
              deletedAt: new Date()
            }
          );
        }
      }
      return;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не удалось получить архивные товары WB');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */50 * * * *')
  async getOzonTrashItems() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonUrlItemsInfo = 'https://api-seller.ozon.ru/v4/product/info/attributes';
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    const { data }: { data: { result: OzonItemsInfo[] } } = await axios.post(
      ozonUrlItemsInfo,
      {
        limit: 1000,
        last_id: '',
        filter: {
          visibility: 'ARCHIVED'
        }
      },
      { headers }
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of data.result) {
        if (!item.sku) {
          continue;
        }
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: {
            marketplaceIdentifier: String(item.id),
            marketplaceId: ozonMarketplace.id,
            deletedAt: IsNull()
          }
        });
        if (findMpItem) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: findMpItem.id },
            { deletedAt: new Date() }
          );
        }
      }
      return;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить архивные товары Ozon');
    } finally {
      await queryRunner.release();
    }
  }

  // @Cron('0 */51 * * * *')
  // async getYandexTrashItems() {
  //   const businessId = this.configService.get<string>('yandexBusinessId');
  //   let pageToken;
  //   let hasMoreData = true;

  //   const items: { marketplaceIdentifier: string; article: string; sku: string }[] = [];

  //   while (hasMoreData) {
  //     let urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200`;
  //     if (pageToken) {
  //       urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200&page_token=${pageToken}`;
  //     }

  //     const { data }: { data: YandexItems } = await axios.post(
  //       urlItems,
  //       {
  //         data: {
  //           archived: true
  //         }
  //       },
  //       {
  //         headers: {
  //           'Api-Key': 'ACMA:1pUUUtGUjFw0frKFuYg5ymG5nEs5RKNtz5NbW9OQ:226d6e1d'
  //         }
  //       }
  //     );
  //     for (const item of data.result.offerMappings) {
  //       if (!item.mapping.marketSku) {
  //         continue;
  //       }
  //       items.push({
  //         marketplaceIdentifier: String(item.mapping.marketSku),
  //         article: item.offer.offerId,
  //         sku: String(0)
  //       });
  //     }
  //     if (data.result.paging?.nextPageToken) {
  //       pageToken = data.result.paging.nextPageToken;
  //     } else {
  //       hasMoreData = false;
  //     }
  //   }
  //   const yandexMarketplace = await this.infoService.findMarketplace({ title: 'Yandex' });

  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   try {
  //     for (const item of items) {
  //       const findItem = await queryRunner.manager.findOne(Items, {
  //         where: {
  //           marketplaceIdentifier: String(item.marketplaceIdentifier),
  //           marketplaceId: yandexMarketplace.id,
  //           isArchive: false
  //         }
  //       });

  //       if (findItem) {
  //         await queryRunner.manager.update(
  //           Items,
  //           { id: findItem.id },
  //           {
  //             isArchive: true
  //           }
  //         );
  //       }
  //     }
  //     return;
  //   } catch (error) {
  //     this.logger.error(error);
  //     this.logger.error('Не смог получить архивные товары Яндекс');
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  @Cron('0 */42 * * * *')
  async getOzonItemsFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOzonItems(ozonToken, clientId, ozonMarketplace.id);
    return;
  }

  @Cron('0 */46 * * * *')
  async getOzonItemsSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken || !clientId) return;
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Tamov' });
    await this.getOzonItems(ozonToken, clientId, ozonMarketplace.id);
    return;
  }

  @Cron('0 */44 * * * *')
  async getYandexItemsFirst() {
    const businessId = this.configService.get<string>('yandexBusinessId');
    const apiKey = this.configService.get<string>('yandexToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getYandexItems(businessId, apiKey, 'Yandex');
    return;
  }

  @Cron('0 */45 * * * *')
  async getYandexItemsSecond() {
    const businessId = this.configService.get<string>('yandexTamovBusinessId');
    const apiKey = this.configService.get<string>('yandexTamovToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getYandexItems(businessId, apiKey, 'Yandex Tamov');
    return;
  }

  async getYandexItems(businessId: string, apiKey: string, mpTitle: string) {
    let pageToken;
    let hasMoreData = true;
    const items: YandexItemsResult[] = [];

    while (hasMoreData) {
      let urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200`;
      if (pageToken) {
        urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200&page_token=${pageToken}`;
      }

      const { data }: { data: YandexItems } = await axios.post(
        urlItems,
        {},
        {
          headers: {
            'Api-Key': apiKey
          }
        }
      );
      for (const item of data.result.offerMappings) {
        if (!item.mapping.marketSku) {
          continue;
        }
        const volumeYandex = (
          (item.offer.weightDimensions.length *
            item.offer.weightDimensions.width *
            item.offer.weightDimensions.height) /
          1000
        ).toFixed(2);
        const dimensionsYandex = `${item.offer.weightDimensions.length}/${item.offer.weightDimensions.width}/${item.offer.weightDimensions.height}/${item.offer.weightDimensions.weight}`;
        items.push({
          marketplaceIdentifier: String(item.mapping.marketSku),
          volumeYandex,
          article: item.offer.offerId,
          category: item.mapping.marketCategoryName,
          title: item.offer.name,
          barcode: item.offer.barcodes[0],
          sku: String(0),
          imageUrl: item.offer.pictures[0],
          //Размеры в см, вес в кг
          dimensionsYandex
        });
      }
      if (data.result.paging?.nextPageToken) {
        pageToken = data.result.paging.nextPageToken;
      } else {
        hasMoreData = false;
      }
    }
    const yandexMarketplace = await this.infoService.findMarketplace({ title: mpTitle });

    for (const item of items) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: {
            marketplaceIdentifier: String(item.marketplaceIdentifier),
            marketplaceId: yandexMarketplace.id
          }
        });
        if (!findMpItem) {
          const findItem = await queryRunner.manager.findOne(Items, {
            where: {
              article: item.article
            }
          });
          let itemId: number;
          if (findItem) {
            itemId = findItem.id;
          } else {
            const createItem = queryRunner.manager.create(Items, {
              article: item.article
            });
            await queryRunner.manager.save(Items, createItem);
            itemId = createItem.id;
          }
          const createMarketplaceItem = queryRunner.manager.create(MarketplaceItems, {
            itemId,
            barcode: item.barcode,
            sku: String(0),
            marketplaceIdentifier: String(item.marketplaceIdentifier),
            marketplaceId: yandexMarketplace.id,
            //Размеры в см, вес в кг
            dimensions: item.dimensionsYandex,
            volume: item.volumeYandex,
            category: item.category,
            title: item.title,
            imageUrl: item.imageUrl
          });
          await queryRunner.manager.save(MarketplaceItems, createMarketplaceItem);
        } else {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: findMpItem.id },
            {
              //Размеры в см, вес в кг
              dimensions: item.dimensionsYandex,
              volume: item.volumeYandex,
              category: item.category,
              title: item.title,
              imageUrl: item.imageUrl
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не смог получить товары Яндекс');
      } finally {
        await queryRunner.release();
      }
    }
  }

  async getOzonItems(ozonToken: string, clientId: string, marketplaceId: number) {
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonCategoryUrl = 'https://api-seller.ozon.ru/v1/description-category/tree';
    const { data: categoryData }: { data: { result: OzonCategoryData[] } } = await axios.post(
      ozonCategoryUrl,
      {},
      { headers }
    );
    const mappedCategory = categoryData.result.flatMap(el => {
      return el.children.map(i => {
        return {
          title: i.category_name,
          id: i.description_category_id,
          subTypes: i.children.map(q => {
            return {
              title: q.type_name,
              id: q.type_id
            };
          })
        };
      });
    });
    const ozonUrlItemsInfo = 'https://api-seller.ozon.ru/v4/product/info/attributes';
    const { data }: { data: { result: OzonItemsInfo[] } } = await axios.post(
      ozonUrlItemsInfo,
      {
        limit: 1000,
        last_id: '',
        filter: {
          visibility: 'ALL'
        }
      },
      { headers }
    );
    for (const item of data.result) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        if (!item.sku) {
          continue;
        }
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: { marketplaceIdentifier: String(item.id), marketplaceId }
        });
        const volumeOzon = String(((item.depth / 10) * (item.width / 10) * (item.height / 10)) / 1000);
        let category = 'Другое';
        const findCategory = mappedCategory.find(el => {
          return el.id === item.description_category_id;
        });
        if (findCategory && item.type_id) {
          const findSubCategory = findCategory.subTypes.find(el => el.id === item.type_id);
          if (findSubCategory) {
            category = findSubCategory.title;
          }
        }
        if (!findMpItem) {
          const findItem = await queryRunner.manager.findOne(Items, {
            where: {
              article: item.offer_id
            }
          });
          let itemId: number;
          if (findItem) {
            itemId = findItem.id;
          } else {
            const createItem = queryRunner.manager.create(Items, {
              article: item.offer_id
            });
            await queryRunner.manager.save(Items, createItem);
            itemId = createItem.id;
          }
          const createMarketplaceItem = queryRunner.manager.create(MarketplaceItems, {
            itemId,
            barcode: item.barcode,
            sku: String(item.sku),
            marketplaceIdentifier: String(item.id),
            marketplaceId,
            //Переводим размеры в см, вес в кг
            dimensions: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`,
            volume: volumeOzon,
            category,
            title: item.name,
            imageUrl: item.primary_image
          });
          await queryRunner.manager.save(MarketplaceItems, createMarketplaceItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findMpItem.itemId },
            {
              article: item.offer_id
            }
          );
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: findMpItem.id },
            {
              //Переводим размеры в см, вес в кг
              dimensions: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`,
              volume: volumeOzon,
              title: item.name,
              imageUrl: item.primary_image,
              category
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не смог получить товары Ozon');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateItemSendStatus() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
      const findMpItems = await queryRunner.manager
        .createQueryBuilder(MarketplaceItems, 'mpItems')
        .innerJoinAndSelect('mpItems.sendStatus', 'sendStatus', 'sendStatus.title NOT IN (:...titles)', {
          titles: ['Нельзя (ручная)', 'Можно (ручная)']
        })
        .leftJoinAndSelect('mpItems.item', 'item')
        .addSelect(subQuery => {
          return subQuery
            .select('COALESCE(SUM(stock.currentValue), 0)', 'stocksSum')
            .from('stocks', 'stock')
            .where('stock.marketplace_item_id = mpItems.id')
            .andWhere('DATE(stock.createdAt) = CURRENT_DATE');
        }, 'stocksSum')
        .addSelect(subQuery => {
          return subQuery
            .select('COALESCE(SUM(ord.quantity), 0)', 'ordersSum')
            .from('orders_v2', 'ord')
            .where('ord.marketplace_item_id = mpItems.id')
            .andWhere('ord.created_at >= DATE(:weekAgo)', { weekAgo });
        }, 'ordersSum')
        .where('mpItems.deletedAt IS NULL')
        .getRawAndEntities();
      const mappedItems: StopListCronResult[] = [];
      findMpItems.entities.forEach((item, index) => {
        const raw = findMpItems.raw[index];
        mappedItems.push({
          orders: Number(raw.ordersSum),
          stocks: Number(raw.stocksSum),
          itemId: item.itemId,
          itemArticle: item.item.article,
          classification: item.item.classification,
          mpItemId: item.id
        });
      });
      const findSuccessStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Можно',
        type: StatusesTypes.Отправка
      });
      const findRejectStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Нельзя',
        type: StatusesTypes.Отправка
      });
      const findBestSellerStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Bestseller',
        type: StatusesTypes.Отправка
      });
      const findNewStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Новинка',
        type: StatusesTypes.Отправка
      });
      for (const item of mappedItems) {
        //Считаем скорость продаж на 1 день и умножаем на 30 дней
        const salesSpeed = Number((item.orders / 7).toFixed(2)) * 30;
        if (item.stocks - salesSpeed <= 0) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: item.mpItemId },
            { sendStatusId: findRejectStatus.id }
          );
          continue;
        }
        if (item.classification === 'Бестселлер / А' && item.stocks - salesSpeed > 0) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: item.mpItemId },
            { sendStatusId: findBestSellerStatus.id }
          );
        } else if (item.classification === 'Новинка / A' && item.stocks - salesSpeed > 0) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: item.mpItemId },
            { sendStatusId: findNewStatus.id }
          );
        } else if (item.classification === 'Хит продаж / А' && item.stocks - salesSpeed > 0) {
          await queryRunner.manager.update(
            MarketplaceItems,
            { id: item.mpItemId },
            { sendStatusId: findSuccessStatus.id }
          );
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не смог изменить статусы отправки');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updateItems() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .where('items.classification = :classification', { classification: 'Новинка / A' })
        .getMany();
      for (const item of findItems) {
        await queryRunner.manager.update(Items, item.id, {
          virality: 'виральный предположительно'
        });
      }
      return;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог обновить товар');
    } finally {
      await queryRunner.release();
    }
  }

  // @Cron('0 1 * * 1')
  async updateItemsClassification() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .where('items.classification = :classification', { classification: 'Новинка / A' })
        .andWhere("items.wbCreatedAt <= NOW() - INTERVAL '6 months'")
        .getMany();
      for (const item of findItems) {
        await queryRunner.manager.update(Items, item.id, {
          classification: 'Промежуточный статус'
        });
      }
      await queryRunner.commitTransaction();
      return;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не смог обновить классификацию');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateWbItemsPrices() {
    let getItems: WbItemsPrices = {
      data: {
        listGoods: []
      }
    };
    try {
      const apiToken = this.configService.get<string>('wbToken');
      const wbUrl =
        'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=0';
      const getItemsFromWb = await axios.get<WbItemsPrices>(wbUrl, {
        headers: {
          Authorization: apiToken
        }
      });
      getItems = getItemsFromWb.data;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить цены товаров WB');
    }
    if (!getItems.data.listGoods.length) {
      return;
    }
    const manager = this.dataSource.manager;
    try {
      const itemsId = getItems.data.listGoods.map(el => String(el.nmID));
      const findMarketplace = await this.infoService.findMarketplace({ title: 'WB' });
      const findMpItems = await manager.find(MarketplaceItems, {
        where: {
          marketplaceIdentifier: In(itemsId),
          marketplaceId: findMarketplace.id,
          deletedAt: IsNull()
        }
      });
      for (const item of getItems.data.listGoods) {
        const findItem = findMpItems.find(el => el.marketplaceIdentifier === String(item.nmID));
        if (findItem) {
          await manager.update(
            MarketplaceItems,
            { id: findItem.id },
            {
              discount: item.discount,
              price: item?.sizes?.[0]?.price ?? null,
              priceWithDiscount: item?.sizes?.[0]?.discountedPrice ?? null
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог проставить цену товарам WB');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateOzonItemsPrices() {
    let getItems: OzonItemsPrices = {
      items: []
    };
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonPricesUrl = 'https://api-seller.ozon.ru/v5/product/info/prices';
    try {
      const { data: ozonPrices }: { data: OzonItemsPrices } = await axios.post(
        ozonPricesUrl,
        {
          limit: 1000,
          filter: {
            visibility: 'ALL'
          }
        },
        { headers }
      );
      getItems = ozonPrices;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить цены товаров Ozon');
    }

    const manager = this.dataSource.manager;
    try {
      const itemsId = getItems.items.map(el => String(el.product_id));
      if (!itemsId.length) {
        return;
      }
      const findMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
      const findItems = await manager.find(MarketplaceItems, {
        where: {
          marketplaceIdentifier: In(itemsId),
          marketplaceId: findMarketplace.id,
          deletedAt: IsNull()
        }
      });
      for (const item of getItems.items) {
        const findItem = findItems.find(el => el.marketplaceIdentifier === String(item.product_id));
        if (findItem) {
          await manager.update(
            MarketplaceItems,
            { id: findItem.id },
            {
              price: item.price.price,
              priceWithDiscount: item.price.marketing_seller_price,
              discount: item.price.price
                ? Number(
                    (
                      ((item.price.price - item.price.marketing_seller_price) / item.price.price) *
                      100
                    ).toFixed(2)
                  )
                : 0
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог проставить цену товарам Ozon');
    }
  }
}
