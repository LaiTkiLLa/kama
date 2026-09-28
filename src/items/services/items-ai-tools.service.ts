import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Items } from '../entities/items.entity';
import { MarketplaceItems } from '../entities/marketplace-items.entity';
import { Suppliers } from '../../info/entities/suppliers.entity';
import { ItemsSuppliers } from '../entities/items_suppliers.entity';
import { InfoService } from '../../info/info.service';
import { CreateTestItemArgs } from '../../ai/tools/items/dto/create-test-item.schema';

/**
 * Domain-логика для AI tools модуля items.
 * Отдельно от `ItemsService`, чтобы не менять контракт legacy endpoint'ов (`POST /api/items` и т.д.).
 */
@Injectable()
export class ItemsAiToolsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly infoService: InfoService
  ) {}

  private logger: Logger = new Logger(ItemsAiToolsService.name);

  /** Первая буква заглавная, остальные строчные (ru). */
  private normalizeCategory(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return trimmed;
    }
    return trimmed.charAt(0).toLocaleUpperCase('ru-RU') + trimmed.slice(1).toLocaleLowerCase('ru-RU');
  }

  async createTestItem(args: CreateTestItemArgs): Promise<{ id: number; article: string }> {
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

      const {
        lengthMasterBox,
        widthMasterBox,
        heightMasterBox,
        weightMasterBox,
        title,
        costInYuan,
        costInYuanWhite,
        costCalculationType,
        calculationType,
        downloadCalculationMethod,
        multiplicity,
        lengthItem,
        widthItem,
        heightItem,
        weightItem,
        wbCategory,
        ozonCategory,
        yandexCategory,
        dutyPercentage
      } = args;
      const normalizedWbCategory = this.normalizeCategory(wbCategory);
      const normalizedOzonCategory = this.normalizeCategory(ozonCategory);
      const normalizedYandexCategory = this.normalizeCategory(yandexCategory);
      // Формат как у card sync: `length/width/height/weight` (см, кг); volume в литрах.
      // WB считает объём по округлённым вверх габаритам, Ozon — по фактическим.
      const dimensionsMasterBox = `${lengthMasterBox}/${widthMasterBox}/${heightMasterBox}/${weightMasterBox}`;
      const dimensionsFact = `${lengthItem}/${widthItem}/${heightItem}/${weightItem}`;
      const volumeWb = (
        (Math.ceil(Number(lengthItem)) * Math.ceil(Number(widthItem)) * Math.ceil(Number(heightItem))) /
        1000
      ).toFixed(2);
      const volumeOzon = ((Number(lengthItem) * Number(widthItem) * Number(heightItem)) / 1000).toFixed(2);

      const createItem = queryRunner.manager.create(Items, {
        createdForCalculation: true,
        article: 'тестовый артикул',
        downloadCalculationMethod,
        calculationType,
        costCalculationType
      });
      await queryRunner.manager.save(Items, createItem);
      const article = `тестовый артикул ${createItem.id}`;
      const titleItem = title ? title : `тестовое название ${createItem.id}`;
      await queryRunner.manager.update(
        Items,
        { id: createItem.id },
        { article, category: normalizedWbCategory, title: titleItem, dutyPercentage }
      );

      const listings: Array<{
        marketplaceId: number;
        category: string;
        dimensions?: string;
        volume?: string;
      }> = [
        {
          marketplaceId: findWbMp.id,
          dimensions: dimensionsFact,
          volume: volumeWb,
          category: normalizedWbCategory
        },
        {
          marketplaceId: findOzonMp.id,
          dimensions: dimensionsFact,
          volume: volumeOzon,
          category: normalizedOzonCategory
        },
        { marketplaceId: findYandexMp.id, category: normalizedYandexCategory },
        { marketplaceId: findYandexTamovMp.id, category: normalizedYandexCategory },
        {
          marketplaceId: findOzonTamovMp.id,
          dimensions: dimensionsFact,
          volume: volumeOzon,
          category: normalizedOzonCategory
        }
      ];
      for (const listing of listings) {
        const createMarketplaceItem = queryRunner.manager.create(MarketplaceItems, {
          itemId: createItem.id,
          marketplaceId: listing.marketplaceId,
          category: listing.category,
          title: titleItem,
          barcode: `тестовый баркод ${createItem.id} ${listing.marketplaceId}`,
          sku: `тестовый ску ${createItem.id} ${listing.marketplaceId}`,
          marketplaceIdentifier: `тестовый идентификатор ${createItem.id} ${listing.marketplaceId}`,
          dimensions: listing.dimensions,
          volume: listing.volume
        });
        await queryRunner.manager.save(MarketplaceItems, createMarketplaceItem);
      }

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
        multiplicity,
        boxNumber: 'тестовый номер короба',
        costInYuanWhite,
        costInYuan,
        dimensionsFact,
        dimensionsMasterBox,
        volume: volumeOzon
      });
      await queryRunner.commitTransaction();
      return { id: createItem.id, article };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не удалось добавить тестовый товар через тулзы');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
