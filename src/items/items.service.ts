import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, FindOptionsWhere, In, QueryRunner } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { OzomItemsInfo, OzonItems } from './interfaces/ozon-items.interface';
import { Items } from './entities/items.entity';
import { WbItem, WbItems } from './interfaces/wb-items.interface';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { YandexItems } from './interfaces/yandex-items.interface';
import { GetItemsListDto } from './dto/get-items-list.dto';

@Injectable()
export class ItemsService {
  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(ItemsService.name);

  async getOzonItemsList(getItemsListDto: GetItemsListDto) {
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      let items: Items[];
      if (getItemsListDto.itemsId) {
        items = await queryRunner.manager.find(Items, {
          where: { id: In(getItemsListDto.itemsId), marketplaceId: ozonMarketplace.id }
        });
      } else {
        items = await queryRunner.manager.find(Items, { where: { marketplaceId: ozonMarketplace.id } });
      }
      return items.map(item => ({ id: item.id, sku: item.sku }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список товаров');
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
            category: categoryList[item.description_category_id],
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
}
