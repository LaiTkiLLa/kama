import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Brackets, DataSource, FindOptionsWhere, In, QueryRunner } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { Items } from './entities/items.entity';
import { WbItem, WbItems } from './interfaces/wb-items.interface';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { YandexItems } from './interfaces/yandex-items.interface';
import { GetItemsListDto } from './dto/get-items-list.dto';
import { Marketplaces } from '../info/entities/marketplaces.entity';
import { UpdateItemInfoDto } from './dto/update-item-info.dto';
import { StopListCronResult, StopListResponse } from './interfaces/stop-list.interface';
import { GetItemsStopListDto } from './dto/get-items-stop-list.dto';
import { UpdateStopListItems } from './dto/update-status-stop-list.dto';
import { StatusesTypes } from '../info/enum/statuses.enum';
import { UpdateArrayDirectoryItemsInfoDto } from './dto/update-directory-item-info.dto';
import { Suppliers } from '../info/entities/suppliers.entity';
import { OzonItemsInfo } from './interfaces/ozon-items-info.interface';
import { GetItemsDirectoryList } from './interfaces/get-items-directory-list.interface';

@Injectable()
export class ItemsService {
  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(ItemsService.name);

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

  async getItemsDirectoryList() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .leftJoinAndSelect('items.supplier', 'supplier')
        .leftJoinAndSelect('items.marketplace', 'marketplace')
        .getMany();
      return findItems.reduce<GetItemsDirectoryList[]>((acc, item) => {
        const findItem = acc.find(el => el.article === item.article);
        if (!findItem) {
          acc.push({
            article: item.article,
            ownCategory: item.ownCategory,
            image: item.imageUrl,
            barcode: item.barcode,
            supplierTitle: item.supplier ? item.supplier.title : null,
            title: item.title,
            classification: item.classification,
            multiplicity: item.multiplicity,
            boxNumber: item.boxNumber,
            dimensionsFact: item.dimensionsFact,
            dimensionsWB: item.dimensionsWB,
            dimensionsOzon: item.dimensionsOzon,
            volume: item.volume,
            wbCreatedAt: item.wbCreatedAt
          });
        } else {
          if (item.marketplace.title === 'WB') {
            findItem.dimensionsWB = item.dimensionsWB;
            findItem.wbCreatedAt = item.wbCreatedAt;
          } else if (item.marketplace.title === 'Озон') {
            findItem.dimensionsOzon = item.dimensionsOzon;
          }
        }
        return acc;
      }, []);
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
        if (!findItems) {
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
            volume: item.volume
          }
        );
      }
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить справочник товаров');
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
        .innerJoinAndSelect('items.marketplace', 'marketplace', 'marketplace.title != :title', {
          title: 'Ozon Second'
        })
        .leftJoinAndSelect('items.direction', 'direction')
        .leftJoinAndSelect('items.sendStatus', 'sendStatus')
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
        }, 'ordersSum');
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
          activeStatuses: ['Новинка', 'Top']
        });
      }
      const result = await queryBuilder.getRawAndEntities();
      const mappedItems: StopListResponse[] = [];
      result.entities.forEach((item, index) => {
        const findArticle = mappedItems.find(el => el.article === item.article);
        const raw = result.raw[index];
        const wbBarcode = item.marketplace.title === 'WB' ? item.barcode : undefined;
        const wbIdentifier = item.marketplace.title === 'WB' ? item.marketplaceIdentifier : undefined;
        if (findArticle) {
          if (wbBarcode) {
            findArticle.wbBarcode = wbBarcode;
          }
          if (wbIdentifier) {
            findArticle.wbIdentifier = wbIdentifier;
          }
          findArticle.marketplace.push({
            id: item.marketplaceId,
            title: item.marketplace.title,
            itemId: item.id,
            orders: Number(raw.ordersSum),
            stocks: Number(raw.stocksSum),
            sendStatus: {
              id: item.sendStatusId,
              title: item.sendStatus.title
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
            marketplace: [
              {
                id: item.marketplaceId,
                title: item.marketplace.title,
                itemId: item.id,
                orders: Number(raw.ordersSum),
                stocks: Number(raw.stocksSum),
                sendStatus: {
                  id: item.sendStatusId,
                  title: item.sendStatus.title
                }
              }
            ],
            direction: {
              id: item.directionId,
              title: item.direction.title
            }
          });
        }
      });
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
              withPhoto: 1
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
        const findColor = item.characteristics.find(el => el.name === 'Цвет');
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.nmID), marketplaceId: wbMarketplace.id }
        });
        if (!findItem) {
          const createItem = queryRunner.manager.create(Items, {
            article: item.vendorCode,
            category: item.subjectName,
            title: item.title,
            barcode: '0',
            sku: '0',
            marketplaceIdentifier: String(item.nmID),
            imageUrl: item.photos[0].big,
            marketplaceId: wbMarketplace.id,
            color: findColor ? findColor.value[0] : '',
            wbCreatedAt: item.createdAt,
            //Размеры в см, вес в кг
            dimensionsWB: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.vendorCode,
              category: item.subjectName,
              title: item.title,
              color: findColor ? findColor.value[0] : '',
              //Размеры в см, вес в кг
              dimensionsWB: `${item.dimensions.length}/${item.dimensions.width}/${item.dimensions.height}/${item.dimensions.weightBrutto}`
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
  // @Cron(CronExpression.EVERY_MINUTE)
  async getYandexItems() {
    const businessId = await this.configService.get('yandexBusinessId');
    const itemsUrl = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200`;
    const { data }: { data: YandexItems } = await axios.post(
      itemsUrl,
      {},
      {
        headers: {
          'Api-Key': 'ACMA:1pUUUtGUjFw0frKFuYg5ymG5nEs5RKNtz5NbW9OQ:226d6e1d'
        }
      }
    );
    const yandexMarketplace = await this.infoService.findMarketplace({ title: 'Yandex' });
    for (const item of data.result.offerMappings) {
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        if (!item.mapping.marketSku) {
          continue;
        }
        const findItem = await queryRunner.manager.findOne(Items, {
          where: {
            marketplaceIdentifier: String(item.mapping.marketSku),
            marketplaceId: yandexMarketplace.id
          }
        });
        if (!findItem) {
          const createItem = queryRunner.manager.create(Items, {
            article: item.offer.offerId,
            category: item.offer.category ?? item.mapping.marketCategoryName,
            title: item.offer.name,
            barcode: item.offer.barcodes[0],
            sku: String(0),
            marketplaceIdentifier: String(item.mapping.marketSku),
            imageUrl: item.offer.pictures[0],
            marketplaceId: yandexMarketplace.id
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.offer.offerId,
              title: item.offer.name,
              category: item.offer.category ?? item.mapping.marketCategoryName
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
            dimensionsOzon: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.offer_id,
              title: item.name,
              //Переводим размеры в см, вес в кг
              dimensionsOzon: `${Number((item.depth / 10).toFixed(2))}/${Number((item.width / 10).toFixed(2))}/${Number((item.height / 10).toFixed(2))}/${Number((item.weight / 1000).toFixed(3))}`
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
          titles: ['Нельзя (ручная)', 'Можно (ручная)', 'Top', 'Новинка']
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
          itemId: item.id
        });
      });
      const findSuccessStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Можно',
        type: StatusesTypes.Отправка
      });
      const findRecommendedStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Желательно',
        type: StatusesTypes.Отправка
      });
      const findRejectStatus = await this.infoService.findStatus(queryRunner, {
        title: 'Нельзя',
        type: StatusesTypes.Отправка
      });
      for (const item of mappedItems) {
        const result = item.stocks / item.orders;
        if (result >= 2) {
          await queryRunner.manager.update(
            Items,
            { id: item.itemId },
            { sendStatusId: findRecommendedStatus.id }
          );
        } else if (item.stocks - item.orders <= 0) {
          await queryRunner.manager.update(Items, { id: item.itemId }, { sendStatusId: findRejectStatus.id });
        } else if (item.stocks - item.orders > 0) {
          await queryRunner.manager.update(
            Items,
            { id: item.itemId },
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
}
