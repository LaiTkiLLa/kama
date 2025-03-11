import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { InfoService } from '../info/info.service';
import { ConfigService } from '@nestjs/config';
import { OzonItems } from './interfaces/ozon-items.interface';

@Injectable()
export class ItemsService {
  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getOzonItems() {
    const queryRunner = await this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const itemsUrl = 'https://api-seller.ozon.ru/v3/product/list';
      const ozonMarketplace = await this.infoService.findMarketplace({ title: 'Озон' }, queryRunner);
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
      // const ozonUrlListItems = 'https://api-seller.ozon.ru/v3/product/info/list'
      //
      // const optionsListItems = {
      //   "method": "POST",
      //   "headers": headers,
      //   "contentType": "application/json",
      //   "payload": JSON.stringify(listItemsBody)
      // };
      //
      // const responseListItems = UrlFetchApp.fetch(ozonUrlListItems, optionsListItems)
      // const dataListItems = JSON.parse(responseListItems.getContentText());
      //
      // const categoryList = {
      //   17028709: 'Фитнес и йога',
      //   17028698: 'Туристическая посуда',
      //   17028707: 'Гантели'
      // }
      //
      // for (const item of dataListItems.items){
      //   const findItem = result.find(value => value.sku === item.sources[0].sku)
      //   if (!findItem){
      //     continue
      //   }
      //   findItem.typeId = item.type_id
      //   findItem.descriptionCategoryId = item.description_category_id
      //   findItem.imageUrl = item.primary_image
      //   findItem.category = categoryList[item.description_category_id]
    } catch (error) {
      console.log(error);
    } finally {
      await queryRunner.release();
    }
  }
}
