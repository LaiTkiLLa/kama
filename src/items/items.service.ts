import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, FindOptionsWhere, QueryRunner } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { OzomItemsInfo, OzonItems } from './interfaces/ozon-items.interface';
import { Items } from './entities/items.entity';

@Injectable()
export class ItemsService {
  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(ItemsService.name)

  async findItem(where: FindOptionsWhere<Items>, queryRunner: QueryRunner) {
    return queryRunner.manager.findOne(Items, { where });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getOzonItems() {
    const itemsUrl = 'https://api-seller.ozon.ru/v3/product/list';
    const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' });
    const ozonToken = await this.configService.get('ozonToken');
    const clientId = await this.configService.get('ozonClientId');
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
          where: { marketplaceIdentifier: String(item.id) }
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
            marketplaceId: ozonMarketplace.id
          });
          await queryRunner.manager.save(Items, createItem);
          await queryRunner.commitTransaction();
        }
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(error)
        this.logger.error('Не смог получить товары Ozon')
      } finally {
        await queryRunner.release();
      }
    }
    return;
  }
}
