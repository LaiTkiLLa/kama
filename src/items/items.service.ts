import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
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
import { OzonItemsInfo, OzonItemsPrices } from './interfaces/ozon-items-info.interface';
import { GetDirectoryListDto } from './dto/get-directory-list.dto';
import { ItemsSuppliers } from './entities/items_suppliers.entity';
import { MarketplaceItems } from './entities/marketplace-items.entity';
import { MarketplaceInfo, SupplierInfo } from './interfaces/get-items-directory-list.interface';
import { Statuses } from 'src/info/entities/statuses.entity';
import { GetErpItemsListDto } from './dto/get-erp-items-list.dto';
import { MarketplaceItemSizes } from './entities/marketplace-item-sizes.entity';
import { Characteristics } from './entities/characteristics.entity';
import { ItemCharacteristics } from './entities/item-characteristics.entity';
import { CharacteristicValues } from './entities/characteristic-values.entity';
import { UpdateErpLogisticInfoDto } from './dto/update-erp-logistic-info.dto';
import { MarketplaceCategories } from '../info/entities/marketplace-categories.entity';

@Injectable()
export class ItemsService {
  private readonly sizeCharacteristicName = 'Размер';

  constructor(
    private dataSource: DataSource,
    private infoService: InfoService,
    private configService: ConfigService
  ) {}

  private logger: Logger = new Logger(ItemsService.name);

  private normalizeSizeValue(wbSize: string | null | undefined, techSize: string): string {
    return (wbSize?.trim() || techSize?.trim() || '').trim();
  }

  /**
   * Product-level размеры из WB sizes → item_characteristics.
   * techSize = '0' → one-size, вариаций нет.
   */
  private async syncItemSizeCharacteristics(
    manager: EntityManager,
    itemId: number,
    sizes: { techSize: string; wbSize: string }[]
  ): Promise<void> {
    if (!sizes?.length) {
      return;
    }

    let sizeCharacteristic = await manager.findOne(Characteristics, {
      where: { name: this.sizeCharacteristicName, deletedAt: IsNull() }
    });
    if (!sizeCharacteristic) {
      sizeCharacteristic = await manager.save(
        Characteristics,
        manager.create(Characteristics, {
          name: this.sizeCharacteristicName,
          type: 'string'
        })
      );
    }

    const hasVariations = sizes.some(size => size.techSize !== '0');
    const targetValues = hasVariations
      ? Array.from(
          new Set(
            sizes
              .filter(size => size.techSize !== '0')
              .map(size => this.normalizeSizeValue(size.wbSize, size.techSize))
              .filter(Boolean)
          )
        )
      : [];

    const existing = await manager.find(ItemCharacteristics, {
      where: {
        itemId,
        characteristicId: sizeCharacteristic.id,
        deletedAt: IsNull()
      }
    });

    const targetSet = new Set(targetValues);

    for (const value of targetValues) {
      if (!existing.some(row => row.value === value)) {
        await manager.save(
          ItemCharacteristics,
          manager.create(ItemCharacteristics, {
            itemId,
            characteristicId: sizeCharacteristic.id,
            value
          })
        );
      }

      const dictionaryValue = await manager.findOne(CharacteristicValues, {
        where: {
          characteristicId: sizeCharacteristic.id,
          value,
          deletedAt: IsNull()
        }
      });
      if (!dictionaryValue) {
        await manager.save(
          CharacteristicValues,
          manager.create(CharacteristicValues, {
            characteristicId: sizeCharacteristic.id,
            value
          })
        );
      }
    }

    for (const row of existing) {
      if (!targetSet.has(row.value)) {
        await manager.update(ItemCharacteristics, row.id, { deletedAt: new Date() });
      }
    }
  }

  async createTestItem() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // LEGACY: расчётный товар (`createdForCalculation`) получает listings на все кабинеты
      // (WB / Озон / Yandex / Tamov), чтобы Sheets мог писать volume/title по МП.
      // Это не реальные карточки. Пересмотреть, когда появится создание товара из GAS.
      const findWbMp = await this.infoService.findMarketplace({ title: 'WB' });
      const findOzonMp = await this.infoService.findMarketplace({ title: 'Озон' });
      const findYandexMp = await this.infoService.findMarketplace({ title: 'Yandex' });
      const findYandexTamovMp = await this.infoService.findMarketplace({ title: 'Yandex Tamov' });
      const findOzonTamovMp = await this.infoService.findMarketplace({ title: 'Ozon Tamov' });
      const createItem = queryRunner.manager.create(Items, {
        createdForCalculation: true,
        article: 'тестовый артикул'
      });
      await queryRunner.manager.save(Items, createItem);
      await queryRunner.manager.update(
        Items,
        { id: createItem.id },
        {
          article: `тестовый артикул ${createItem.id}`,
          category: 'тестовая категория',
          title: `тестовое название ${createItem.id}`
        }
      );
      const createMarketplaceItemWb = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findWbMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id} ${findWbMp.id}`,
        sku: `тестовый ску ${createItem.id} ${findWbMp.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${findWbMp.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItemWb);
      const createMarketplaceItemOzon = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findOzonMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id} ${findOzonMp.id}`,
        sku: `тестовый ску ${createItem.id} ${findOzonMp.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${findOzonMp.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItemOzon);
      const createMarketplaceItemYandex = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findYandexMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id} ${findYandexMp.id}`,
        sku: `тестовый ску ${createItem.id} ${findYandexMp.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${findYandexMp.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItemYandex);
      const createMarketplaceItemYandexTamov = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findYandexTamovMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id} ${findYandexTamovMp.id}`,
        sku: `тестовый ску ${createItem.id} ${findYandexTamovMp.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${findYandexTamovMp.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItemYandexTamov);
      const createMarketplaceItemOzonTamov = queryRunner.manager.create(MarketplaceItems, {
        itemId: createItem.id,
        marketplaceId: findOzonTamovMp.id,
        category: 'тестовая категория',
        title: `тестовое название ${createItem.id}`,
        barcode: `тестовый баркод ${createItem.id} ${findOzonTamovMp.id}`,
        sku: `тестовый ску ${createItem.id} ${findOzonTamovMp.id}`,
        marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${findOzonTamovMp.id}`
      });
      await queryRunner.manager.save(MarketplaceItems, createMarketplaceItemOzonTamov);
      const findSupplier = await queryRunner.manager.findOne(Suppliers, {
        where: {
          title: 'Системный поставщик'
        }
      });
      if (!findSupplier) {
        throw new NotFoundException('Поставщик не найден');
      }
      await queryRunner.manager.insert(ItemsSuppliers, {
        itemId: createItem.id,
        supplierId: findSupplier.id,
        multiplicity: 'тестовая кратность',
        boxNumber: 'тестовый номер короба'
      });
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
        .leftJoinAndSelect(
          'marketplaceItems.marketplaceItemSizes',
          'marketplaceItemSizes',
          'marketplaceItemSizes.deletedAt IS NULL'
        )
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
      return findItems.map(item => {
        const marketplacesInfo: MarketplaceInfo[] = [];
        marketplacesInfo.push(
          ...item.marketplaceItems.map(el => ({
            title: el.marketplace.title,
            marketplaceItemSizes: (el.marketplaceItemSizes ?? []).map(el => {
              return {
                size: el.name,
                skus: Array.isArray(el.metadata?.skus) ? el?.metadata?.skus : [],
                chrtId: el.marketplaceSizeId,
                value: el.value
              };
            }),
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
        const suppliersInfo: SupplierInfo[] = [];
        if (item.itemsSuppliers.length) {
          for (const itemSupplier of item.itemsSuppliers) {
            suppliersInfo.push({
              title: itemSupplier.supplier.title,
              multiplicity: itemSupplier.multiplicity,
              boxNumber: itemSupplier.boxNumber,
              dimensionsFact: itemSupplier.dimensionsFact,
              volume: itemSupplier.volume,
              costInYuan: itemSupplier.costInYuan,
              costInYuanWhite: itemSupplier.costInYuanWhite,
              dimensionsMasterBox: itemSupplier.dimensionsMasterBox,
              payment: itemSupplier.payment,
              assembling: itemSupplier.assembling,
              production: itemSupplier.production,
              supplierMinimumOrder: itemSupplier.supplierMinimumOrder
            });
          }
        }
        return {
          id: item.id,
          article: item.article,
          ownCategory: item.ownCategory,
          supplierTitle: item.itemsSuppliers.length ? item.itemsSuppliers[0].supplier.title : null,
          articleOld: item.articleOld,
          title: item.title,
          category: item.category,
          classification: item.classification,
          multiplicity: item.itemsSuppliers.length ? item.itemsSuppliers[0].multiplicity : null,
          boxNumber: item.itemsSuppliers.length ? item.itemsSuppliers[0].boxNumber : null,
          dimensionsFact: item.itemsSuppliers.length ? item.itemsSuppliers[0].dimensionsFact : null,
          volume: item.itemsSuppliers.length ? item.itemsSuppliers[0].volume : null,
          wbCreatedAt: item.wbCreatedAt,
          costInYuan: item.itemsSuppliers.length ? item.itemsSuppliers[0].costInYuan : null,
          costInRub: item.costInRub,
          ownImagesUrl: item.ownImagesUrl,
          transportRateUsd: item.transportRateUsd,
          dutyPercentage: item.dutyPercentage,
          tariffWeight: item.tariffWeight,
          createdForCalculation: item.createdForCalculation,
          costInYuanWhite: item.itemsSuppliers.length ? item.itemsSuppliers[0].costInYuanWhite : null,
          codeTNVED: item.codeTNVED,
          dimensionsMasterBox: item.itemsSuppliers.length ? item.itemsSuppliers[0].dimensionsMasterBox : null,
          consolidation: item.consolidation,
          payment: item.itemsSuppliers.length ? item.itemsSuppliers[0].payment : null,
          assembling: item.itemsSuppliers.length ? item.itemsSuppliers[0].assembling : null,
          fullfillmentAcceptance: item.fullfillmentAcceptance,
          marketplaceAcceptance: item.marketplaceAcceptance,
          production: item.itemsSuppliers.length ? item.itemsSuppliers[0].production : null,
          buffer: item.buffer,
          daysDeliveryToRussia: item.daysDeliveryToRussia,
          supplierMinimumOrder: item.itemsSuppliers.length
            ? item.itemsSuppliers[0].supplierMinimumOrder
            : null,
          virality: item.virality,
          costCalculationType: item.costCalculationType,
          calculationType: item.calculationType,
          downloadCalculationMethod: item.downloadCalculationMethod,
          marketplacesInfo,
          suppliersInfo
        };
      });
      // for (const item of findItems) {
      //   const findItem = filterWbItems.find(wbItem => wbItem.article === item.article);
      //   if (findItem) {
      //     findItem.marketplacesInfo.push(
      //       ...item.marketplaceItems.map(el => ({
      //         title: el.marketplace.title,
      //         marketplaceItemSizes: (el.marketplaceItemSizes ?? []).map(el => {
      //           return {
      //             size: el.name,
      //             skus: Array.isArray(el.metadata?.skus) ? el?.metadata?.skus : [],
      //             chrtId: el.marketplaceSizeId,
      //             value: el.value
      //           };
      //         }),
      //         dimensions: el.dimensions,
      //         volume: Number(el.volume).toFixed(2),
      //         sku: el.sku,
      //         marketplaceIdentifier: el.marketplaceIdentifier,
      //         category: el.category,
      //         barcode: el.barcode,
      //         image: el.imageUrl,
      //         color: el.color,
      //         itemTitle: el.title,
      //         price: el.price,
      //         discount: el.discount,
      //         priceWithDiscount: el.priceWithDiscount
      //       }))
      //     );
      //   }
      // }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить справочник товаров');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getItemsErpList(getErpItemsListDto: GetErpItemsListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .leftJoinAndSelect(
          'items.marketplaceItems',
          'marketplaceItems',
          `marketplaceItems.deletedAt IS NULL AND marketplaceItems.marketplaceId = (
            SELECT m.id FROM marketplaces m WHERE m.title = :marketplaceTitle LIMIT 1
          )`,
          { marketplaceTitle: getErpItemsListDto.marketplace }
        )
        .leftJoinAndSelect(
          'marketplaceItems.marketplaceItemSizes',
          'marketplaceItemSizes',
          'marketplaceItemSizes.deletedAt IS NULL'
        )
        .leftJoinAndSelect('marketplaceItems.marketplace', 'marketplace')
        .where('items.isArchive = :isArchive', { isArchive: false });
      if (getErpItemsListDto.withTestArticles === false) {
        queryBuilder.andWhere('items.createdForCalculation = :createdForCalculation', {
          createdForCalculation: false
        });
      }
      const findItems = await queryBuilder.orderBy('items.id', 'ASC').getMany();
      return findItems.map(item => {
        const wbListing = item.marketplaceItems[0];
        return {
          id: item.id,
          article: item.article,
          title: item.title,
          category: item.category,
          ownCategory: item.ownCategory,
          image: wbListing?.imageUrl ?? '',
          color: wbListing?.color ?? '',
          barcode: wbListing?.barcode ?? '',
          chrtId: wbListing?.chrtId ?? 0,
          consolidation: item.consolidation,
          fullfillmentAcceptance: item.fullfillmentAcceptance,
          marketplaceAcceptance: item.marketplaceAcceptance,
          daysDeliveryToRussia: item.daysDeliveryToRussia,
          transportRateUsd: item.transportRateUsd,
          dutyPercentage: item.dutyPercentage,
          costCalculationType: item.costCalculationType,
          calculationType: item.calculationType,
          downloadCalculationMethod: item.downloadCalculationMethod,
          transportType: item.transportType,
          deliveryMethod: item.deliveryMethod,
          marketplaceItemsInfo: item.marketplaceItems.map(mpItem => {
            return {
              marketplaceItemId: mpItem.id,
              marketplaceTitle: mpItem.marketplace.title,
              marketplaceItemSizes: (mpItem.marketplaceItemSizes ?? []).map(el => {
                return {
                  sizeId: el.id,
                  size: el.name,
                  skus: Array.isArray(el.metadata?.skus) ? el?.metadata?.skus : [],
                  chrtId: el.marketplaceSizeId,
                  value: el.value
                };
              })
            };
          })
        };
      });
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить ERP-список товаров');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSuppliersItemsErpList(getErpItemsListDto: GetErpItemsListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const queryBuilder = queryRunner.manager
        .createQueryBuilder(ItemsSuppliers, 'itemsSuppliers')
        .leftJoinAndSelect('itemsSuppliers.item', 'item')
        .leftJoinAndSelect('itemsSuppliers.supplier', 'supplier')
        .leftJoinAndSelect(
          'item.itemCharacteristics',
          'itemCharacteristics',
          'itemCharacteristics.deletedAt IS NULL'
        )
        .leftJoinAndSelect('itemCharacteristics.characteristic', 'characteristic')
        .where('item.isArchive = :isArchive', { isArchive: false });
      if (getErpItemsListDto.withTestArticles === false) {
        queryBuilder.andWhere('item.createdForCalculation = :createdForCalculation', {
          createdForCalculation: false
        });
      }
      const findItemsSuppliers = await queryBuilder.orderBy('item.id', 'ASC').getMany();
      return findItemsSuppliers.map(itemsSupplier => {
        return {
          itemId: itemsSupplier.itemId,
          supplierId: itemsSupplier.supplierId,
          itemSupplierId: itemsSupplier.id,
          supplierMinimumOrder: itemsSupplier.supplierMinimumOrder,
          article: itemsSupplier.item.article,
          title: itemsSupplier.item.title,
          category: itemsSupplier.item.category,
          supplierTitle: itemsSupplier.supplier.title,
          boxNumber: itemsSupplier.boxNumber,
          costInYuan: itemsSupplier.costInYuan,
          costInYuanWhite: itemsSupplier.costInYuanWhite,
          multiplicity: itemsSupplier.multiplicity,
          assembling: itemsSupplier.assembling,
          production: itemsSupplier.production,
          payment: itemsSupplier.payment,
          dimensionsFact: itemsSupplier.dimensionsFact,
          dimensionsMasterBox: itemsSupplier.dimensionsMasterBox,
          volume: itemsSupplier.volume,
          characteristics: itemsSupplier.item.itemCharacteristics.map(el => {
            return {
              name: el.characteristic.name,
              value: el.value,
              characteristicId: el.characteristicId
            };
          })
        };
      });
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить ERP-список товаров-поставщиков');
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
        const supplierLinkFields = {
          multiplicity: item.multiplicity,
          boxNumber: item.boxNumber,
          costInYuan: item.costInYuan,
          costInYuanWhite: item.costInYuanWhite,
          assembling: item.assembling,
          production: item.production,
          supplierMinimumOrder: item.supplierMinimumOrder,
          payment: item.payment,
          dimensionsFact: item.dimensionsFact,
          dimensionsMasterBox: item.dimensionsMasterBox,
          volume: item.volume
        };
        const findItemsSupplier = await queryRunner.manager.find(ItemsSuppliers, {
          where: {
            itemId: findItem.id
          }
        });
        if (item.supplier) {
          const findSupplier = await queryRunner.manager.findOne(Suppliers, {
            where: {
              title: item.supplier
            }
          });
          if (!findSupplier) {
            throw new NotFoundException('Поставщик не найден');
          }
          const findItemSupplier = await queryRunner.manager.findOne(ItemsSuppliers, {
            where: {
              itemId: findItem.id,
              supplierId: findSupplier.id
            }
          });
          if (findItemSupplier) {
            await queryRunner.manager.update(
              ItemsSuppliers,
              { itemId: findItem.id, supplierId: findSupplier.id },
              {
                ...supplierLinkFields
              }
            );
          } else {
            await queryRunner.manager.insert(ItemsSuppliers, {
              supplierId: findSupplier.id,
              itemId: findItem.id,
              ...supplierLinkFields
            });
          }
        } else if (findItemsSupplier.length) {
          // await queryRunner.manager.update(ItemsSuppliers, { itemId: findItem.id }, supplierLinkFields);
        }
        await queryRunner.manager.update(
          Items,
          { id: findItem.id },
          {
            ownCategory: item.ownCategory,
            classification: item.classification,
            articleOld: item.articleOld,
            costInRub: item.costInRub,
            ownImagesUrl: item.ownImagesUrl,
            transportRateUsd: item.transportRateUsd,
            dutyPercentage: item.dutyPercentage,
            tariffWeight: item.tariffWeight,
            codeTNVED: item.codeTNVED,
            consolidation: item.consolidation,
            fullfillmentAcceptance: item.fullfillmentAcceptance,
            marketplaceAcceptance: item.marketplaceAcceptance,
            buffer: item.buffer,
            daysDeliveryToRussia: item.daysDeliveryToRussia,
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
          } else if (mpItem.marketplace.title === 'Yandex Tamov') {
            await queryRunner.manager.update(
              MarketplaceItems,
              { id: mpItem.id },
              { category: item.category, title: findItem.createdForCalculation ? item.title : undefined }
            );
          } else if (mpItem.marketplace.title === 'Ozon Tamov') {
            await queryRunner.manager.update(
              MarketplaceItems,
              { id: mpItem.id },
              {
                category: item.category,
                volume: findItem.createdForCalculation ? item.volumeOzon : undefined,
                title: findItem.createdForCalculation ? item.title : undefined
              }
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

  async updateErpLogisticsInfo(updateErpLogisticInfoDto: UpdateErpLogisticInfoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findItems = await queryRunner.manager
        .createQueryBuilder(Items, 'items')
        .where('items.id IN (:...ids)', { ids: updateErpLogisticInfoDto.items.map(item => item.id) })
        .getMany();

      if (findItems.length !== updateErpLogisticInfoDto.items.length) {
        throw new NotFoundException('Не все товары найдены');
      }
      for (const item of updateErpLogisticInfoDto.items) {
        await queryRunner.manager.update(
          Items,
          { id: item.id },
          {
            consolidation: item.consolidation,
            daysDeliveryToRussia: item.daysDeliveryToRussia,
            fullfillmentAcceptance: item.fullfillmentAcceptance,
            marketplaceAcceptance: item.marketplaceAcceptance,
            costCalculationType: item.costCalculationType,
            downloadCalculationMethod: item.downloadCalculationMethod,
            calculationType: item.calculationType,
            transportType: item.transportType,
            deliveryMethod: item.deliveryMethod
          }
        );
      }
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог обновить логистическую информацию');
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
                  `SUM(CASE WHEN stock.warehouse_id IN (18, 1146895, 16, 59, 95, 1146938, 1146932, 1147083, 19, 1146912, 1146906, 242582, 158, 67, 1146879, 1146902, 1146903, 1146878, 1146919, 1147137, 1147160, 1146898, 1147058, 211146887, 1146888, 1146889, 383378, 80330, 1146880, 1146881, 22, 1146893, 1146031, 1149375, 43) THEN 0 ELSE stock.current_value END)`,
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
      let yandexTamovStatus: string | undefined = undefined;
      let ozonTamovStatus: string | undefined = undefined;
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
        if (status.marketplace === 'Yandex Tamov') {
          yandexTamovStatus = status.status;
        }
        if (status.marketplace === 'Ozon Tamov') {
          ozonTamovStatus = status.status;
        }
      });
      return {
        article: item.itemArticle,
        wbStatus,
        yandexStatus,
        ozonStatus,
        yandexTamovStatus,
        ozonTamovStatus
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
        const findYandexTamovItem = findItem?.marketplaceItems.find(
          el => el.marketplace.title === 'Yandex Tamov'
        );
        const findOzonTamovItem = findItem?.marketplaceItems.find(
          el => el.marketplace.title === 'Ozon Tamov'
        );
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
        if (item.ozonTamovStatus && findOzonTamovItem) {
          const findStatusOzonTamov = await queryRunner.manager.findOne(Statuses, {
            where: {
              title: item.ozonTamovStatus,
              type: StatusesTypes.Отправка
            }
          });
          if (findStatusOzonTamov) {
            await queryRunner.manager.update(MarketplaceItems, findOzonTamovItem.id, {
              sendStatusId: findStatusOzonTamov.id
            });
          }
        }
        if (item.yandexTamovStatus && findYandexTamovItem) {
          const findStatusYandexTamov = await queryRunner.manager.findOne(Statuses, {
            where: {
              title: item.yandexTamovStatus,
              type: StatusesTypes.Отправка
            }
          });
          if (findStatusYandexTamov) {
            await queryRunner.manager.update(MarketplaceItems, findYandexTamovItem.id, {
              sendStatusId: findStatusYandexTamov.id
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
          if (item?.sizes?.length) {
            for (const size of item.sizes) {
              const sizePayload = {
                name: size.techSize,
                value: size.wbSize,
                metadata: { skus: size.skus ?? [] }
              };
              const findSize = await queryRunner.manager.findOne(MarketplaceItemSizes, {
                where: {
                  marketplaceItemId: createMarketplaceItem.id,
                  marketplaceSizeId: String(size.chrtID),
                  deletedAt: IsNull()
                }
              });
              if (findSize) {
                await queryRunner.manager.update(MarketplaceItemSizes, findSize.id, sizePayload);
              } else {
                const createSize = queryRunner.manager.create(MarketplaceItemSizes, {
                  marketplaceItemId: createMarketplaceItem.id,
                  marketplaceSizeId: String(size.chrtID),
                  ...sizePayload
                });
                await queryRunner.manager.save(MarketplaceItemSizes, createSize);
              }
            }
            await this.syncItemSizeCharacteristics(queryRunner.manager, itemId, item.sizes);
          }
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
          if (item?.sizes?.length) {
            for (const size of item.sizes) {
              const sizePayload = {
                name: size.techSize,
                value: size.wbSize,
                metadata: { skus: size.skus ?? [] }
              };
              const findSize = await queryRunner.manager.findOne(MarketplaceItemSizes, {
                where: {
                  marketplaceItemId: findMpItem.id,
                  marketplaceSizeId: String(size.chrtID),
                  deletedAt: IsNull()
                }
              });
              if (findSize) {
                await queryRunner.manager.update(MarketplaceItemSizes, findSize.id, sizePayload);
              } else {
                const createSize = queryRunner.manager.create(MarketplaceItemSizes, {
                  marketplaceItemId: findMpItem.id,
                  marketplaceSizeId: String(size.chrtID),
                  ...sizePayload
                });
                await queryRunner.manager.save(MarketplaceItemSizes, createSize);
              }
            }
            await this.syncItemSizeCharacteristics(queryRunner.manager, findMpItem.itemId, item.sizes);
          }
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

  @Cron('0 */51 * * * *')
  async getOzonTrashItemsFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    await this.getOzonTrashItems(ozonToken, clientId, 'Озон');
    return;
  }

  @Cron('0 */50 * * * *')
  async getOzonTrashItemsSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken || !clientId) return;
    await this.getOzonTrashItems(ozonToken, clientId, 'Ozon Tamov');
    return;
  }

  async getOzonTrashItems(token: string, clientId: string, mpTitle: string) {
    const headers = {
      'Client-Id': clientId,
      'Api-Key': token
    };
    const ozonUrlItemsInfo = 'https://api-seller.ozon.ru/v4/product/info/attributes';
    const ozonMarketplace = await this.infoService.findMarketplace({ title: mpTitle });
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
      this.logger.error(`Не смог получить архивные товары ${mpTitle}`);
    } finally {
      await queryRunner.release();
    }
  }

  @Cron('0 */51 * * * *')
  async getYandexTrashItemsFirst() {
    const businessId = this.configService.get<string>('yandexBusinessId');
    const apiKey = this.configService.get<string>('yandexToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getYandexTrashItems(businessId, apiKey, 'Yandex');
    return;
  }

  @Cron('0 */52 * * * *')
  async getYandexTrashItemsSecond() {
    const businessId = this.configService.get<string>('yandexTamovBusinessId');
    const apiKey = this.configService.get<string>('yandexTamovToken');
    if (!businessId) return;
    if (!apiKey) return;
    await this.getYandexTrashItems(businessId, apiKey, 'Yandex Tamov');
    return;
  }

  async getYandexTrashItems(businessId: string, apiKey: string, mpTitle: string) {
    let pageToken;
    let hasMoreData = true;

    const items: { marketplaceIdentifier: string; article: string; sku: string }[] = [];

    while (hasMoreData) {
      let urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200`;
      if (pageToken) {
        urlItems = `https://api.partner.market.yandex.ru/businesses/${businessId}/offer-mappings?limit=200&page_token=${pageToken}`;
      }

      const { data }: { data: YandexItems } = await axios.post(
        urlItems,
        {
          archived: true
        },
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
        items.push({
          marketplaceIdentifier: String(item.mapping.marketSku),
          article: item.offer.offerId,
          sku: String(0)
        });
      }
      if (data.result.paging?.nextPageToken) {
        pageToken = data.result.paging.nextPageToken;
      } else {
        hasMoreData = false;
      }
    }
    const yandexMarketplace = await this.infoService.findMarketplace({ title: mpTitle });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      for (const item of items) {
        const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
          where: {
            marketplaceIdentifier: String(item.marketplaceIdentifier),
            marketplaceId: yandexMarketplace.id,
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
      this.logger.error(`Не смог получить архивные товары ${mpTitle}`);
    } finally {
      await queryRunner.release();
    }
  }

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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const types = await queryRunner.manager.find(MarketplaceCategories, {
        where: {
          platform: 'Ozon',
          nodeType: 'ozon_type',
          deletedAt: IsNull()
        }
      });
      const ozonTypeTitles = new Map(types.map(type => [type.externalId, type.title]));
      for (const item of data.result) {
        if (!item.sku) {
          continue;
        }
        await queryRunner.startTransaction();
        try {
          const findMpItem = await queryRunner.manager.findOne(MarketplaceItems, {
            where: { marketplaceIdentifier: String(item.id), marketplaceId }
          });
          const volumeOzon = String(((item.depth / 10) * (item.width / 10) * (item.height / 10)) / 1000);
          let category = 'Другое';
          if (item.type_id) {
            const categoryTitle = ozonTypeTitles.get(String(item.type_id));
            if (categoryTitle) {
              category = categoryTitle;
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
          this.logger.error(`Не смог синхронизировать товар Ozon offer_id=${item.offer_id}`);
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить товары Ozon');
    } finally {
      await queryRunner.release();
    }
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
  async updateOzonItemsPricesFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    await this.updateOzonItemsPrices(ozonToken, clientId, 'Озон');
    return;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateOzonItemsPricesSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken || !clientId) return;
    await this.updateOzonItemsPrices(ozonToken, clientId, 'Ozon Tamov');
    return;
  }

  async updateOzonItemsPrices(token: string, clientId: string, mpTitle: string) {
    let getItems: OzonItemsPrices = {
      items: []
    };
    const headers = {
      'Client-Id': clientId,
      'Api-Key': token
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
      const findMarketplace = await this.infoService.findMarketplace({ title: mpTitle });
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
      this.logger.error(`Не смог проставить цену товарам ${mpTitle}`);
    }
  }
}
