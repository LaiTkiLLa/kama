import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Brackets, DataSource, FindOptionsWhere, In, QueryRunner } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { OzomItemsInfo, OzonItems } from './interfaces/ozon-items.interface';
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
      const queryBuilder = await queryRunner.manager
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
      const result = await queryBuilder.getRawAndEntities();
      const mappedItems: StopListResponse[] = [];
      result.entities.forEach((item, index) => {
        const findArticle = mappedItems.find(el => el.article === item.article);
        const raw = result.raw[index];
        if (findArticle) {
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
    const items = updateStopListItems.items.flatMap(item =>
      item.statuses.map(el => {
        let wbStatus: undefined | string;
        let ozonStatus: undefined | string;
        let yandexStatus: undefined | string;
        if (el.marketplace === 'WB') {
          wbStatus = el.status;
        }
        if (el.marketplace === 'Озон') {
          ozonStatus = el.status;
        }
        if (el.marketplace === 'Yandex') {
          yandexStatus = el.status;
        }
        return {
          article: item.itemArticle,
          wbStatus,
          yandexStatus,
          ozonStatus
        };
      })
    );
    console.log(items);
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
          throw new NotFoundException('Товар не найден');
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
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.nmID), marketplaceId: wbMarketplace.id }
        });
        if (!findItem) {
          const createItem = await queryRunner.manager.create(Items, {
            article: item.vendorCode,
            category: item.subjectName,
            title: item.title,
            barcode: '0',
            sku: '0',
            marketplaceIdentifier: String(item.nmID),
            imageUrl: item.photos[0].big,
            marketplaceId: wbMarketplace.id
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            { article: item.vendorCode, category: item.subjectName, title: item.title }
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
          const createItem = await queryRunner.manager.create(Items, {
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
    const itemsUrl = 'https://api-seller.ozon.ru/v3/product/list';
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const getOzonItems: { data: { result: OzonItems } } = await axios.post(
      itemsUrl,
      {
        limit: 1000,
        last_id: '',
        filter: {
          visibility: 'ALL'
        }
      },
      { headers }
    );
    const itemsInfo: { article: string; marketplaceIdentifier: string }[] = [];
    for (const item of getOzonItems.data.result.items) {
      itemsInfo.push({
        article: item.offer_id,
        marketplaceIdentifier: item.product_id.toString()
      });
    }
    const ozonUrlListItems = 'https://api-seller.ozon.ru/v3/product/info/list';

    const { data }: { data: OzomItemsInfo } = await axios.post(
      ozonUrlListItems,
      {
        product_id: itemsInfo.map(item => item.marketplaceIdentifier)
      },
      { headers }
    );
    const categoryList = {
      17028709: 'Фитнес и йога',
      17028698: 'Туристическая посуда',
      17028707: 'Гантели'
    };
    for (const item of data.items) {
      const queryRunner = await this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        if (!item.sources.length) {
          continue;
        }
        const findItem = await queryRunner.manager.findOne(Items, {
          where: { marketplaceIdentifier: String(item.id), marketplaceId }
        });
        if (!findItem) {
          const createItem = await queryRunner.manager.create(Items, {
            article: item.offer_id,
            category: categoryList[item.description_category_id] ?? 'Другое',
            title: item.name,
            barcode: item.barcodes[0],
            sku: String(item.sources[0].sku),
            marketplaceIdentifier: String(item.id),
            imageUrl: item.primary_image[0],
            marketplaceId
          });
          await queryRunner.manager.save(Items, createItem);
        } else {
          await queryRunner.manager.update(
            Items,
            { id: findItem.id },
            {
              article: item.offer_id,
              title: item.name
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
        }
        if (result <= 0) {
          await queryRunner.manager.update(Items, { id: item.itemId }, { sendStatusId: findRejectStatus.id });
        }
        if (result > 0) {
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
