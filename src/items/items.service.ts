import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Brackets, DataSource, FindOptionsWhere, In, QueryRunner } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { Items } from './entities/items.entity';
import { WbItem, WbItems, WbTrashedItems } from './interfaces/wb-items.interface';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { YandexItems, YandexItemsResult } from './interfaces/yandex-items.interface';
import { GetItemsListDto } from './dto/get-items-list.dto';
import { Marketplaces } from '../info/entities/marketplaces.entity';
import { UpdateItemInfoDto } from './dto/update-item-info.dto';
import { GetStopListFromDb, StopListCronResult, StopListResponse } from './interfaces/stop-list.interface';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { StatusesTypes } from '../info/enum/statuses.enum';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { Suppliers } from '../info/entities/suppliers.entity';
import { OzonItemsInfo } from './interfaces/ozon-items-info.interface';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';

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
        marketplaceId: findWbMp.id,
        article: 'тестовый артикул',
        category: 'тестовая категория',
        title: 'тестовое название',
        barcode: 'тестовый баркод',
        sku: 'тестовый ску',
        marketplaceIdentifier: 'тестовый идентификатор'
      });
      await queryRunner.manager.save(Items, createItem);
      await queryRunner.manager.update(
        Items,
        { id: createItem.id },
        {
          article: `тестовый артикул ${createItem.id}`,
          title: `тестовое название ${createItem.id}`,
          barcode: `тестовый баркод ${createItem.id}`,
          sku: `тестовый ску ${createItem.id}`,
          marketplaceIdentifier: `тестовый идентификатор ${createItem.id}`
        }
      );
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

  async getItemsList(getItemsListDto: GetItemsListDto): Promise<{ id: number; identifier: string }[]> {
    let marketplace: Marketplaces;
    if (getItemsListDto.marketplaceTitle === 'Ozon') {
      marketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    } else {
      marketplace = await this.infoService.findMarketplace({ title: 'WB' });
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      let items: Items[];
      if (getItemsListDto.itemsId) {
        items = await queryRunner.manager.find(Items, {
          where: { id: In(getItemsListDto.itemsId), marketplaceId: marketplace.id }
        });
      } else {
        items = await queryRunner.manager.find(Items, { where: { marketplaceId: marketplace.id } });
      }
      if (getItemsListDto.marketplaceTitle === 'Ozon') {
        return items.map(item => ({ id: item.id, identifier: item.sku }));
      }
      return items.map(item => ({ id: item.id, identifier: item.marketplaceIdentifier }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список товаров');
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
        .leftJoinAndSelect('items.supplier', 'supplier')
        .leftJoinAndSelect('items.marketplace', 'marketplace')
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
      const filterWbItems = findItems
        .filter(item => item.marketplace.title === 'WB')
        .map(item => {
          return {
            id: item.id,
            article: item.article,
            ownCategory: item.ownCategory,
            image: item.imageUrl,
            barcode: item.barcode,
            supplierTitle: item.supplier ? item.supplier.title : null,
            title: item.title,
            color: item.color,
            articleOld: item.articleOld,
            classification: item.classification,
            multiplicity: item.multiplicity,
            boxNumber: item.boxNumber,
            dimensionsFact: item.dimensionsFact,
            dimensionsWB: item.dimensionsWB,
            dimensionsYandex: '',
            dimensionsOzon: '',
            volume: item.volume,
            wbCreatedAt: item.wbCreatedAt,
            category: item.category,
            planTime: item.planTime,
            productionAndAssemblyTime: item.productionAndAssemblyTime,
            deliveryTime: item.deliveryTime,
            shippingPeriod: item.shippingPeriod,
            stocksInDays: item.stocksInDays,
            costInYuan: item.costInYuan,
            costInRub: item.costInRub,
            replenishmentPeriod: item.replenishmentPeriod,
            remainingBalance: item.remainingBalance,
            frequencyOfSendingCars: item.frequencyOfSendingCars,
            dailyGrowthPercentage: item.dailyGrowthPercentage,
            volumeWB: item.volumeWB,
            volumeOzon: item.createdForCalculation ? item.volumeOzon : '',
            volumeYandex: '',
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
            volumeMasterBox: item.volumeMasterBox
          };
        });
      const filterOzonItems = findItems.filter(item => item.marketplace.title === 'Озон');
      const filterYandexItems = findItems.filter(item => item.marketplace.title === 'Yandex');
      for (const ozonItem of filterOzonItems) {
        const findItem = filterWbItems.find(wbItem => wbItem.article === ozonItem.article);
        if (findItem) {
          findItem.dimensionsOzon = ozonItem.dimensionsOzon;
          findItem.volumeOzon = ozonItem.volumeOzon;
        }
      }
      for (const yandexItem of filterYandexItems) {
        const findItem = filterWbItems.find(wbItem => wbItem.article === yandexItem.article);
        if (findItem) {
          findItem.dimensionsYandex = yandexItem.dimensionsYandex;
          findItem.volumeYandex = yandexItem.volumeYandex;
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

  async updateArrayDirectoryItemsInfo(updateArrayDirectoryItemsInfoDto: UpdateArrayDirectoryItemsInfoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of updateArrayDirectoryItemsInfoDto.items) {
        const findItems = await queryRunner.manager.find(Items, {
          where: {
            article: item.article
          }
        });
        if (!findItems.length) {
          throw new NotFoundException('Артикул не найден');
        }
        let supplierId: number | null = null;
        if (item.supplier) {
          const findSupplier = await queryRunner.manager.findOne(Suppliers, {
            where: {
              title: item.supplier
            }
          });
          if (!findSupplier) {
            throw new NotFoundException('Поставщик не найден');
          }
          supplierId = findSupplier.id;
        }
        await queryRunner.manager.update(
          Items,
          { id: In(findItems.map(el => el.id)) },
          {
            supplierId,
            ownCategory: item.ownCategory,
            classification: item.classification,
            multiplicity: item.multiplicity,
            boxNumber: item.boxNumber,
            dimensionsFact: item.dimensionsFact,
            volume: item.volume,
            articleOld: item.articleOld,
            planTime: item.planTime,
            productionAndAssemblyTime: item.productionAndAssemblyTime,
            deliveryTime: item.deliveryTime,
            shippingPeriod: item.shippingPeriod,
            stocksInDays: item.stocksInDays,
            costInYuan: item.costInYuan,
            costInRub: item.costInRub,
            replenishmentPeriod: item.replenishmentPeriod,
            remainingBalance: item.remainingBalance,
            frequencyOfSendingCars: item.frequencyOfSendingCars,
            dailyGrowthPercentage: item.dailyGrowthPercentage,
            ownImagesUrl: item.ownImagesUrl,
            volumePerUnit: item.volumePerUnit,
            weightPerUnit: item.weightPerUnit,
            transportRateUsd: item.transportRateUsd,
            dutyPercentage: item.dutyPercentage,
            density: item.density,
            tariffWeight: item.tariffWeight,
            title: findItems[0].createdForCalculation ? item.title : undefined,
            volumeWB: findItems[0].createdForCalculation ? item.volumeWB : undefined,
            volumeOzon: findItems[0].createdForCalculation ? item.volumeOzon : undefined,
            costInYuanWhite: item.costInYuanWhite,
            codeTNVED: item.codeTNVED,
            dimensionsMasterBox: item.dimensionsMasterBox,
            volumeMasterBox: item.volumeMasterBox
          }
        );
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

  async updateItemInfo(id: number, updateItemInfoDto: UpdateItemInfoDto): Promise<{ id: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const findItem = await queryRunner.manager.findOne(Items, { where: { id } });
      if (!findItem) {
        throw new NotFoundException('Товар не найден');
      }
      await this.infoService.findStatus(queryRunner, { id: updateItemInfoDto.statusId });
      await this.infoService.findDirection(queryRunner, { id: updateItemInfoDto.directionId });
      await queryRunner.manager.update(
        Items,
        { id },
        { directionId: updateItemInfoDto.directionId, sendStatusId: updateItemInfoDto.statusId }
      );
      await queryRunner.commitTransaction();
      return { id };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог обновить товар');
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getItemStopsList(getItemsStopListDto: GetItemsStopListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const monthAgo = new Date(new Date().setDate(new Date().getDate() - 30));
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .select([
          'items.id AS "itemId"',
          'items.article AS article',
          'items.imageUrl AS "imageUrl"',
          'items.title AS title',
          'items.color AS color',
          'items.barcode AS barcode',
          'items.marketplaceIdentifier AS "marketplaceIdentifier"',
          'items.sku AS sku',

          'directions.id AS "directionId"',
          'directions.title AS "directionTitle"',

          'marketplace.id AS "marketplaceId"',
          'marketplace.title AS "marketplaceTitle"',

          'sendStatus.id AS "sendStatusId"',
          'sendStatus.title AS "sendStatusTitle"'
        ])
        .innerJoin('items.marketplace', 'marketplace', `marketplace.title != 'Ozon Second'`)
        .leftJoin('items.direction', 'directions')
        .leftJoin('items.sendStatus', 'sendStatus')
        .leftJoin(
          qb => {
            return qb
              .select('stock.item_id', 'item_id')
              .addSelect('SUM(stock.current_value)', 'stocks_sum')
              .from('stocks', 'stock')
              .where('DATE(stock.created_at) = CURRENT_DATE')
              .groupBy('stock.item_id');
          },
          'stocks_summary',
          'stocks_summary.item_id = items.id'
        )
        .leftJoin(
          qb => {
            return qb
              .select('ord.item_id', 'item_id')
              .addSelect('SUM(ord.quantity)', 'orders_sum')
              .from('orders', 'ord')
              .where(`ord.created_at >= :monthAgo`, { monthAgo })
              .groupBy('ord.item_id');
          },
          'orders_summary',
          'orders_summary.item_id = items.id'
        )

        .addSelect([
          'COALESCE(stocks_summary.stocks_sum, 0) AS "stocksSum"',
          'COALESCE(orders_summary.orders_sum, 0) AS "ordersSum"'
        ]);
      if (getItemsStopListDto.searchString) {
        const search = `%${getItemsStopListDto.searchString}%`;
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.where('items.article ILIKE :search', { search }).orWhere('items.title ILIKE :search', {
              search
            });
          })
        );
      }
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
      const result: GetStopListFromDb[] = await queryBuilder
        .andWhere('items.createdForCalculation = :createdForCalculation', { createdForCalculation: false })
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
            itemId: item.itemId,
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
                itemId: item.itemId,
                orders: Number(item.ordersSum),
                stocks: Number(item.stocksSum),
                sendStatus: {
                  id: item.sendStatusId,
                  title: item.sendStatusTitle
                }
              }
            ],
            direction: {
              id: item.directionId,
              title: item.directionTitle
            }
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
    const findMarketplaceYandex = await this.infoService.findMarketplace({
      title: 'Yandex'
    });
    const findMarketplaceWB = await this.infoService.findMarketplace({
      title: 'WB'
    });
    const findMarketplaceOzon = await this.infoService.findMarketplace({
      title: 'Озон'
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const item of items) {
        const findItem = await this.findItem({ article: item.article }, queryRunner);
        if (!findItem) {
          continue;
        }
        let findStatusOzon;
        let findStatusWB;
        let findStatusYandex;
        if (item.ozonStatus) {
          findStatusOzon = await this.infoService.findStatus(queryRunner, {
            title: item.ozonStatus,
            type: StatusesTypes.Отправка
          });
          await queryRunner.manager.update(
            Items,
            { marketplaceId: findMarketplaceOzon.id, article: item.article },
            { sendStatusId: findStatusOzon.id }
          );
        }
        if (item.wbStatus) {
          findStatusWB = await this.infoService.findStatus(queryRunner, {
            title: item.wbStatus,
            type: StatusesTypes.Отправка
          });
          await queryRunner.manager.update(
            Items,
            { marketplaceId: findMarketplaceWB.id, article: item.article },
            { sendStatusId: findStatusWB.id }
          );
        }
        if (item.yandexStatus) {
          findStatusYandex = await this.infoService.findStatus(queryRunner, {
            title: item.yandexStatus,
            type: StatusesTypes.Отправка
          });
          await queryRunner.manager.update(
            Items,
            { marketplaceId: findMarketplaceYandex.id, article: item.article },
            { sendStatusId: findStatusYandex.id }
          );
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

  async findItem(where: FindOptionsWhere<Items>, queryRunner: QueryRunner) {
    return queryRunner.manager.findOne(Items, { where });
  }

  async updateItem(
    where: FindOptionsWhere<Items>,
    updateData: QueryDeepPartialEntity<Items>,
    queryRunner: QueryRunner
  ) {
    return queryRunner.manager.update(Items, where, updateData);
  }

  @Cron('0 */40 * * * *')
  async getWbItems() {
    const itemsUrl = 'https://content-api.wildberries.ru/content/v2/get/cards/list';
    const apiToken = await this.configService.get('wbToken');
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
    for (const item of items) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findColor = item?.characteristics?.find(el => el.name === 'Цвет');
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.nmID), marketplaceId: wbMarketplace.id }
        });
        const volumeWB = (
          (item.dimensions.length * item.dimensions.width * item.dimensions.height) /
          1000
        ).toFixed(2);

        if (!findItem) {
          const createItem = queryRunner.manager.create(Items, {
            article: item.vendorCode,
            category: item.subjectName,
            title: item.title,
            barcode: item?.sizes[0]?.skus[0] ?? '0',
            sku: '0',
            marketplaceIdentifier: String(item.nmID),
            imageUrl: item.photos ? item.photos[0].big : null,
            marketplaceId: wbMarketplace.id,
            color: findColor ? findColor.value[0] : '',
            //Размеры в см, вес в кг
            dimensionsWB: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`,
            volumeWB
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.vendorCode,
              sku: '0',
              barcode: item?.sizes[0]?.skus[0] ?? '0',
              category: item.subjectName,
              title: item.title,
              wbCreatedAt: item.createdAt,
              color: findColor ? findColor.value[0] : '',
              imageUrl: item.photos ? item.photos[0].big : null,
              //Размеры в см, вес в кг
              dimensionsWB: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`,
              volumeWB
            }
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error);
        this.logger.error('Не удалось скачать товар WB');
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }

  @Cron('0 */49 * * * *')
  async getWbTrashItems() {
    const itemsUrl = 'https://content-api.wildberries.ru/content/v2/get/cards/trash';
    const apiToken = await this.configService.get('wbToken');
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
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.nmID), marketplaceId: wbMarketplace.id }
        });
        if (findItem) {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              isArchive: true
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
    const ozonToken = await this.configService.get('ozonSecondToken');
    const clientId = await this.configService.get('ozonSecondClientId');
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const ozonUrlItemsInfo = 'https://api-seller.ozon.ru/v4/product/info/attributes';
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Second' });
    await this.getOzonItems(ozonToken, clientId, ozonMarketplace.id);
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
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.id), marketplaceId: ozonMarketplace.id }
        });
        if (findItem) {
          await queryRunner.manager.update(Items, { id: findItem.id }, { isArchive: true });
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

  @Cron('0 */42 * * * *')
  async getOzonItemsFirst() {
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    await this.getOzonItems(ozonToken, clientId, ozonMarketplace.id);
    return;
  }

  @Cron('0 */46 * * * *')
  async getOzonItemsSecond() {
    const ozonToken = await this.configService.get('ozonSecondToken');
    const clientId = await this.configService.get('ozonSecondClientId');
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Ozon Second' });
    await this.getOzonItems(ozonToken, clientId, ozonMarketplace.id);
    return;
  }

  @Cron('0 */44 * * * *')
  async getYandexItems() {
    const businessId = await this.configService.get('yandexBusinessId');
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
            'Api-Key': 'ACMA:1pUUUtGUjFw0frKFuYg5ymG5nEs5RKNtz5NbW9OQ:226d6e1d'
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
          category: item.offer.category ?? item.mapping.marketCategoryName,
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
    const yandexMarketplace = await this.infoService.findMarketplace({ title: 'Yandex' });

    for (const item of items) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        const findItem = await queryRunner.manager.findOne(Items, {
          where: {
            marketplaceIdentifier: String(item.marketplaceIdentifier),
            marketplaceId: yandexMarketplace.id
          }
        });

        if (!findItem) {
          const createItem = queryRunner.manager.create(Items, {
            article: item.article,
            category: item.category,
            title: item.title,
            barcode: item.barcode,
            sku: String(0),
            marketplaceIdentifier: String(item.marketplaceIdentifier),
            imageUrl: item.imageUrl,
            marketplaceId: yandexMarketplace.id,
            //Размеры в см, вес в кг
            dimensionsYandex: item.dimensionsYandex,
            volumeYandex: item.volumeYandex
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.article,
              title: item.title,
              category: item.category,
              //Размеры в см, вес в кг
              dimensionsYandex: item.dimensionsYandex,
              volumeYandex: item.volumeYandex
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
    const categoryList = {
      17028709: 'Фитнес и йога',
      17028698: 'Туристическая посуда',
      17028707: 'Гантели'
    };
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
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.id), marketplaceId }
        });
        const volumeOzon = String(
          Math.ceil(((item.depth / 10) * (item.width / 10) * (item.height / 10)) / 1000)
        );
        if (!findItem) {
          const createItem = queryRunner.manager.create(Items, {
            article: item.offer_id,
            category: categoryList[item.description_category_id] ?? 'Другое',
            title: item.name,
            barcode: item.barcode,
            sku: String(item.sku),
            marketplaceIdentifier: String(item.id),
            imageUrl: item.primary_image,
            marketplaceId,
            //Переводим размеры в см, вес в кг
            dimensionsOzon: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`,
            volumeOzon
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.offer_id,
              title: item.name,
              imageUrl: item.primary_image,
              //Переводим размеры в см, вес в кг
              dimensionsOzon: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`,
              volumeOzon
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
      const monthAgo = new Date(new Date().setDate(new Date().getDate() - 30));
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .innerJoinAndSelect('items.sendStatus', 'sendStatus', 'sendStatus.title NOT IN (:...titles)', {
          titles: ['Нельзя (ручная)', 'Можно (ручная)', 'Bestseller', 'Новинка']
        })
        .addSelect(subQuery => {
          return subQuery
            .select('COALESCE(SUM(stock.currentValue), 0)', 'stocksSum')
            .from('stocks', 'stock')
            .where('stock.item_id = items.id')
            .andWhere('DATE(stock.createdAt) = CURRENT_DATE');
        }, 'stocksSum')
        .addSelect(subQuery => {
          return subQuery
            .select('COALESCE(SUM(ord.quantity), 0)', 'ordersSum')
            .from('orders', 'ord')
            .where('ord.item_id = items.id')
            .andWhere('ord.created_at >= DATE(:monthAgo)', { monthAgo });
        }, 'ordersSum')
        .getRawAndEntities();
      const mappedItems: StopListCronResult[] = [];
      findItems.entities.forEach((item, index) => {
        const raw = findItems.raw[index];
        mappedItems.push({
          orders: Number(raw.ordersSum),
          stocks: Number(raw.stocksSum),
          itemId: item.id,
          classification: item.classification
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
      for (const item of mappedItems) {
        if (item.classification === 'Хит продаж / А' && item.stocks - item.orders > 0) {
          await queryRunner.manager.update(
            Items,
            { id: item.itemId },
            { sendStatusId: findSuccessStatus.id }
          );
        } else {
          await queryRunner.manager.update(Items, { id: item.itemId }, { sendStatusId: findRejectStatus.id });
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

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async updateItemsClassification() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .where('items.classification = :classification', { classification: 'Новинка / A' })
        .andWhere("items.wbCreatedAt <= NOW() - INTERVAL '3 months'")
        .getMany();
      console.log(findItems);
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
}
