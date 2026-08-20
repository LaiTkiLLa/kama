import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, In, IsNull, Not, QueryRunner, Repository } from 'typeorm';
import { Warehouses } from './entities/warehouses.entity';
import { Marketplaces } from './entities/marketplaces.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetYandexWarehouses } from './interfaces/yandex-warehouses.interface';
import { Statuses } from './entities/statuses.entity';
import { GetStatusesListDto } from './dto/get-statuses-list.dto';
import { GetWbOwnWarehouses, GetWbWarehouses } from './interfaces/wb-warehouses.interface';
import { OzonWarehouses } from './interfaces/ozon-warehouses.interface';
import { Contaminants } from './entities/contaminants.entity';
import { Suppliers } from './entities/suppliers.entity';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Banks } from './entities/banks.entity';
import { UpdateContaminantsDto } from './dto/update-contaminants.dto';
import { GetOzonCategoriesResponse } from './interfaces/get-ozon-categories.interfaces';
import { GetWbChildrenCategoriesResponse } from './interfaces/get-wb-categorues.interface';
import {
  MarketplaceCategories,
  MarketplaceCategoryNodeType,
  MarketplaceCategoryPlatform
} from './entities/marketplace-categories.entity';
import { WB_CATEGORY_PARENTS } from './constants/wb-category-parents';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(Marketplaces) private marketplacesRepository: Repository<Marketplaces>,
    private configService: ConfigService,
    private dataSource: DataSource
  ) {}

  private logger: Logger = new Logger(InfoService.name);

  async findMarketplace(where: FindOptionsWhere<Marketplaces>): Promise<Marketplaces> {
    const findMarketplace = await this.marketplacesRepository.findOne({
      where
    });
    if (!findMarketplace) {
      throw new NotFoundException('Маркетплейс не найден');
    }
    return findMarketplace;
  }

  async findStatus(queryRunner: QueryRunner, where: FindOptionsWhere<Statuses>): Promise<Statuses> {
    const findStatus = await queryRunner.manager.findOne(Statuses, { where });
    if (!findStatus) {
      throw new NotFoundException('Статус не найден');
    }
    return findStatus;
  }

  async getStatusesList(getStatusesListDto: GetStatusesListDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findStatuses = await queryRunner.manager.find(Statuses, {
        where: {
          type: getStatusesListDto.type
        }
      });
      return findStatuses.map(status => ({
        id: status.id,
        title: status.title
      }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список статусов');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getContaminantsList() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findContaminants = await queryRunner.manager.find(Contaminants, {
        relations: {
          bank: true
        }
      });
      return findContaminants.map(contaminant => ({
        id: contaminant.id,
        title: contaminant.title,
        country: contaminant.country,
        type: contaminant.type,
        legalTitle: contaminant.legalTitle,
        legalAddress: contaminant.legalAddress,
        accRaschet: contaminant.accRaschet,
        inn: contaminant.inn,
        kpp: contaminant.kpp,
        contact: contaminant.contact,
        contract: contaminant.contract,
        paymentTerms: contaminant.paymentTerms,
        reliabilityRating: contaminant.reliabilityRating,
        warehouseAddress: contaminant.warehouseAddress,
        responsibleEmployee: contaminant.responsibleEmployee,
        comment: contaminant.comment,
        typeOfMutualSettlements: contaminant.typeOfMutualSettlements,
        bank: contaminant.bank
          ? {
              title: contaminant.bank.title ?? null,
              accBik: contaminant.bank.accBik ?? null,
              accKorschet: contaminant.bank.accKorschet ?? null,
              address: contaminant.bank.address ?? null,
              swift: contaminant.bank.swift ?? null
            }
          : null
      }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список контрагентов');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSuppliersList() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findSuppliers = await queryRunner.manager.find(Suppliers, { relations: { bank: true } });
      return findSuppliers.map(supplier => ({
        id: supplier.id,
        title: supplier.title,
        contact: supplier.contact,
        paymentTerms: supplier.paymentTerms,
        typeOfMutualSettlements: supplier.typeOfMutualSettlements,
        legalTitle: supplier.legalTitle,
        legalAddress: supplier.legalAddress,
        accRaschet: supplier.accRaschet,
        reliabilityRating: supplier.reliabilityRating,
        warehouseAddress: supplier.warehouseAddress,
        responsibleEmployee: supplier.responsibleEmployee,
        comment: supplier.comment,
        creditLimit: supplier.creditLimit,
        contract: supplier.contract,
        canBeAbleToStoreInWarehouse: supplier.canBeAbleToStoreInWarehouse,
        numberOfStorageDays: supplier.numberOfStorageDays,
        webSite: supplier.webSite,
        rank: supplier.rank,
        bank: supplier.bank
          ? {
              title: supplier.bank.title ?? null,
              accBik: supplier.bank.accBik ?? null,
              accKorschet: supplier.bank.accKorschet ?? null,
              address: supplier.bank.address ?? null,
              swift: supplier.bank.swift ?? null
            }
          : null
      }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список поставщиков');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWarehousesList() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findWarehouses = await queryRunner.manager
        .createQueryBuilder(Warehouses, 'warehouses')
        .leftJoinAndSelect('warehouses.marketplace', 'marketplace')
        .where('warehouses.marketplaceId IS NOT NULL')
        .andWhere('warehouses.deletedAt IS NULL')
        .getMany();
      if (!findWarehouses.length) {
        return [];
      }
      return findWarehouses.map(warehouse => ({
        id: warehouse.id,
        title: warehouse.title,
        type: warehouse.type,
        marketplace: {
          id: warehouse.marketplace.id,
          title: warehouse.marketplace.title
        }
      }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список складов');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSupplier(id: number, updateSupplierDto: UpdateSupplierDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findSuppliers = await queryRunner.manager.findOne(Suppliers, {
        where: {
          id
        }
      });
      if (!findSuppliers) {
        throw new NotFoundException(['Поставщик не найден']);
      }
      let bankId: number | undefined;
      if (updateSupplierDto.bank) {
        const findBank = await queryRunner.manager.findOne(Banks, {
          where: {
            title: updateSupplierDto.bank.title,
            accBik: updateSupplierDto.bank.accBik,
            accKorschet: updateSupplierDto.bank.accKorschet,
            address: updateSupplierDto.bank.address,
            swift: updateSupplierDto.bank.swift
          }
        });
        if (!findBank) {
          const createBank = await queryRunner.manager.save(Banks, {
            title: updateSupplierDto.bank.title,
            accBik: updateSupplierDto.bank.accBik,
            accKorschet: updateSupplierDto.bank.accKorschet,
            address: updateSupplierDto.bank.address,
            swift: updateSupplierDto.bank.swift
          });
          bankId = createBank.id;
        } else {
          bankId = findBank.id;
        }
      }
      await queryRunner.manager.update(
        Suppliers,
        { id },
        {
          title: updateSupplierDto.title,
          contact: updateSupplierDto.contact,
          contract: updateSupplierDto.contract,
          paymentTerms: updateSupplierDto.paymentTerms,
          typeOfMutualSettlements: updateSupplierDto.typeOfMutualSettlements,
          legalTitle: updateSupplierDto.legalTitle,
          legalAddress: updateSupplierDto.legalAddress,
          accRaschet: updateSupplierDto.accRaschet,
          reliabilityRating: updateSupplierDto.reliabilityRating,
          warehouseAddress: updateSupplierDto.warehouseAddress,
          responsibleEmployee: updateSupplierDto.responsibleEmployee,
          comment: updateSupplierDto.comment,
          creditLimit: updateSupplierDto.creditLimit,
          canBeAbleToStoreInWarehouse: updateSupplierDto.canBeAbleToStoreInWarehouse,
          numberOfStorageDays: updateSupplierDto.numberOfStorageDays,
          webSite: updateSupplierDto.webSite,
          rank: updateSupplierDto.rank,
          bankId
        }
      );
      return { id };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог изменить данные поставщика');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateContaminant(id: number, updateContaminantsDto: UpdateContaminantsDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findContaminant = await queryRunner.manager.findOne(Contaminants, {
        where: {
          id
        }
      });
      if (!findContaminant) {
        throw new NotFoundException(['Контрагент не найден']);
      }
      let bankId: number | undefined;
      if (updateContaminantsDto.bank) {
        const findBank = await queryRunner.manager.findOne(Banks, {
          where: {
            title: updateContaminantsDto.bank.title,
            accBik: updateContaminantsDto.bank.accBik,
            accKorschet: updateContaminantsDto.bank.accKorschet,
            address: updateContaminantsDto.bank.address,
            swift: updateContaminantsDto.bank.swift
          }
        });
        if (!findBank) {
          const createBank = await queryRunner.manager.save(Banks, {
            title: updateContaminantsDto.bank.title,
            accBik: updateContaminantsDto.bank.accBik,
            accKorschet: updateContaminantsDto.bank.accKorschet,
            address: updateContaminantsDto.bank.address,
            swift: updateContaminantsDto.bank.swift
          });
          bankId = createBank.id;
        } else {
          bankId = findBank.id;
        }
      }
      await queryRunner.manager.update(
        Contaminants,
        { id },
        {
          title: updateContaminantsDto.title,
          contact: updateContaminantsDto.contact,
          country: updateContaminantsDto.country,
          type: updateContaminantsDto.type,
          inn: updateContaminantsDto.inn,
          kpp: updateContaminantsDto.kpp,
          reliabilityRating: updateContaminantsDto.reliabilityRating,
          warehouseAddress: updateContaminantsDto.warehouseAddress,
          responsibleEmployee: updateContaminantsDto.responsibleEmployee,
          comment: updateContaminantsDto.comment,
          contract: updateContaminantsDto.contract,
          paymentTerms: updateContaminantsDto.paymentTerms,
          typeOfMutualSettlements: updateContaminantsDto.typeOfMutualSettlements,
          legalTitle: updateContaminantsDto.legalTitle,
          legalAddress: updateContaminantsDto.legalAddress,
          accRaschet: updateContaminantsDto.accRaschet,
          bankId
        }
      );
      return { id };
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог изменить данные поставщика');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getYandexWarehousesFirst() {
    const yandexToken = this.configService.get<string>('yandexToken');
    if (!yandexToken) return;
    await this.getYandexWarehouses(yandexToken, 'Yandex');
    return;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getYandexWarehousesSecond() {
    const yandexToken = this.configService.get<string>('yandexTamovToken');
    if (!yandexToken) return;
    await this.getYandexWarehouses(yandexToken, 'Yandex Tamov');
    return;
  }

  async getYandexWarehouses(yandexToken: string, mpTitle: string) {
    const warehousesUrl = 'https://api.partner.market.yandex.ru/warehouses';
    const { data }: { data: GetYandexWarehouses } = await axios.get(warehousesUrl, {
      headers: {
        'Api-Key': yandexToken
      }
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findMarketplace = await queryRunner.manager.findOne(Marketplaces, {
        where: {
          title: mpTitle
        }
      });
      if (!findMarketplace) {
        this.logger.error(`Не нашел маркетплейс «${mpTitle}»`);
        return;
      }
      for (const warehouse of data.result.warehouses) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: {
            marketplaceInternalNumber: String(warehouse.id),
            marketplaceId: findMarketplace.id
          }
        });
        if (!findWarehouse) {
          const createWarehouse = queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceInternalNumber: String(warehouse.id),
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Warehouses, createWarehouse);
        } else {
          await queryRunner.manager.update(Warehouses, findWarehouse.id, {
            title: warehouse.name,
            marketplaceInternalNumber: String(warehouse.id)
          });
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Не смог получить склады ${mpTitle}`);
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getWbOwnWarehouses() {
    const apiToken = this.configService.get<string>('wbToken');
    const warehousesUrl = 'https://marketplace-api.wildberries.ru/api/v3/warehouses';
    const response = await axios.get<GetWbOwnWarehouses[]>(warehousesUrl, {
      headers: {
        Authorization: apiToken
      }
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findMarketplace = await queryRunner.manager.findOne(Marketplaces, {
        where: {
          title: 'WB'
        }
      });
      if (!findMarketplace) {
        this.logger.error('Не нашел ВБ в маркетплейсах');
        return;
      }
      for (const warehouse of response.data) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: String(warehouse.id) }
        });
        if (!findWarehouse) {
          const createWarehouse = queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceInternalNumber: String(warehouse.id),
            type: 'FBS',
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Warehouses, createWarehouse);
        } else {
          await queryRunner.manager.update(Warehouses, findWarehouse.id, {
            title: warehouse.name
          });
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить склады WB');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async getWbWarehouses() {
    const apiToken = this.configService.get<string>('wbToken');
    const warehousesUrl = 'https://supplies-api.wildberries.ru/api/v1/warehouses';
    const response = await axios.get<GetWbWarehouses[]>(warehousesUrl, {
      headers: {
        Authorization: apiToken
      }
    });
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findMarketplace = await queryRunner.manager.findOne(Marketplaces, {
        where: {
          title: 'WB'
        }
      });
      if (!findMarketplace) {
        this.logger.error('Не нашел ВБ в маркетплейсах');
        return;
      }
      for (const warehouse of response.data) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: String(warehouse.ID) }
        });
        if (!findWarehouse) {
          const createWarehouse = queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceInternalNumber: String(warehouse.ID),
            type: 'FBO',
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Warehouses, createWarehouse);
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить склады WB');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async getOzonWarehousesFirst() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    await this.getOzonWarehouses(clientId, ozonToken, 'Озон');
    return;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getOzonWarehousesSecond() {
    const ozonToken = this.configService.get<string>('ozonTamovToken');
    const clientId = this.configService.get<string>('ozonTamovClientId');
    if (!ozonToken || !clientId) return;
    await this.getOzonWarehouses(clientId, ozonToken, 'Ozon Tamov');
    return;
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async syncOzonCategories() {
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    await this.syncOzonCategoriesFromApi(clientId, ozonToken);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncWbCategories() {
    const wbToken = this.configService.get<string>('wbToken');
    if (!wbToken) return;
    await this.syncWbCategoriesFromApi(wbToken);
  }

  private async syncWbCategoriesFromApi(wbToken: string) {
    const parentEntries = Object.entries(WB_CATEGORY_PARENTS);
    if (!parentEntries.length) {
      this.logger.warn('WB_CATEGORY_PARENTS пуст — sync категорий WB пропущен');
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const seenIds: number[] = [];
      const platform: MarketplaceCategoryPlatform = 'WB';

      for (const [parentExternalId, parentMeta] of parentEntries) {
        const allowedTitles = new Set(parentMeta.categories ?? []);
        if (!allowedTitles.size) {
          this.logger.warn(`WB parent ${parentExternalId}: categories пуст — subjects не синхронизируются`);
          continue;
        }

        const parentId = await this.upsertMarketplaceCategory(queryRunner, {
          platform,
          nodeType: 'wb_parent',
          externalId: parentExternalId,
          title: parentMeta.title,
          parentId: null,
          isDisabled: false,
          isVisible: parentMeta.isVisible ?? null,
          isSelectable: false
        });
        seenIds.push(parentId);

        let responseChildrenCategories: { data: GetWbChildrenCategoriesResponse };
        try {
          const childrenCategoriesUrl = `https://content-api.wildberries.ru/content/v2/object/all?parentID=${parentExternalId}&limit=1000`;
          responseChildrenCategories = await axios.get<GetWbChildrenCategoriesResponse>(
            childrenCategoriesUrl,
            {
              headers: {
                Authorization: wbToken
              }
            }
          );
        } catch (error) {
          this.logger.error(error);
          this.logger.error(`Не смог получить subjects WB для parentID=${parentExternalId}`);
          continue;
        }

        const matchedTitles = new Set<string>();
        for (const subject of responseChildrenCategories.data.data) {
          if (!allowedTitles.has(subject.subjectName)) {
            continue;
          }
          matchedTitles.add(subject.subjectName);
          const subjectId = await this.upsertMarketplaceCategory(queryRunner, {
            platform,
            nodeType: 'wb_subject',
            externalId: String(subject.subjectID),
            title: subject.subjectName,
            parentId,
            isDisabled: false,
            isVisible: null,
            isSelectable: true
          });
          seenIds.push(subjectId);
        }
      }

      await this.softDeleteStaleMarketplaceCategories(queryRunner, platform, seenIds);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не смог синхронизировать категории WB');
    } finally {
      await queryRunner.release();
    }
  }

  private async syncOzonCategoriesFromApi(clientId: string, ozonToken: string) {
    let response: { data: GetOzonCategoriesResponse };
    try {
      const categoriesUrl = 'https://api-seller.ozon.ru/v1/description-category/tree';
      response = await axios.post<GetOzonCategoriesResponse>(
        categoriesUrl,
        {},
        {
          headers: {
            'Client-Id': clientId,
            'Api-Key': ozonToken
          }
        }
      );
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить категории Ozon по API');
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const seenIds: number[] = [];
      const platform: MarketplaceCategoryPlatform = 'Ozon';

      for (const root of response.data.result) {
        for (const category of root.children) {
          const categoryId = await this.upsertMarketplaceCategory(queryRunner, {
            platform,
            nodeType: 'ozon_category',
            externalId: String(category.description_category_id),
            title: category.category_name,
            parentId: null,
            isDisabled: category.disabled,
            isVisible: null,
            isSelectable: false
          });
          seenIds.push(categoryId);

          for (const typeNode of category.children) {
            const typeId = await this.upsertMarketplaceCategory(queryRunner, {
              platform,
              nodeType: 'ozon_type',
              externalId: String(typeNode.type_id),
              title: typeNode.type_name,
              parentId: categoryId,
              isDisabled: typeNode.disabled,
              isVisible: null,
              isSelectable: true
            });
            seenIds.push(typeId);
          }
        }
      }

      await this.softDeleteStaleMarketplaceCategories(queryRunner, platform, seenIds);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error);
      this.logger.error('Не смог синхронизировать категории Ozon');
    } finally {
      await queryRunner.release();
    }
  }

  private async upsertMarketplaceCategory(
    queryRunner: QueryRunner,
    params: {
      platform: MarketplaceCategoryPlatform;
      nodeType: MarketplaceCategoryNodeType;
      externalId: string;
      title: string;
      parentId: number | null;
      isDisabled: boolean;
      isVisible: boolean | null;
      isSelectable: boolean;
    }
  ): Promise<number> {
    const existing = await queryRunner.manager.findOne(MarketplaceCategories, {
      where: {
        platform: params.platform,
        nodeType: params.nodeType,
        externalId: params.externalId
      }
    });

    if (existing) {
      await queryRunner.manager.update(MarketplaceCategories, existing.id, {
        title: params.title,
        parentId: params.parentId,
        isDisabled: params.isDisabled,
        isVisible: params.isVisible,
        isSelectable: params.isSelectable,
        deletedAt: null
      });
      return existing.id;
    }

    const created = await queryRunner.manager.save(
      MarketplaceCategories,
      queryRunner.manager.create(MarketplaceCategories, params)
    );
    return created.id;
  }

  private async softDeleteStaleMarketplaceCategories(
    queryRunner: QueryRunner,
    platform: MarketplaceCategoryPlatform,
    seenIds: number[]
  ) {
    if (!seenIds.length) {
      await queryRunner.manager.update(
        MarketplaceCategories,
        { platform, deletedAt: IsNull() },
        { deletedAt: new Date() }
      );
      return;
    }

    await queryRunner.manager.update(
      MarketplaceCategories,
      {
        platform,
        deletedAt: IsNull(),
        id: Not(In(seenIds))
      },
      { deletedAt: new Date() }
    );
  }

  async getOzonWarehouses(clientId: string, ozonToken: string, mpTitle: string) {
    let data: OzonWarehouses;
    try {
      const warehousesUrl = 'https://api-seller.ozon.ru/v1/warehouse/ozon/list';
      const response = await axios.post<OzonWarehouses>(
        warehousesUrl,
        {
          warehouse_types: [
            'FULL_FILLMENT',
            'FULL_FILLMENT_RETURNS',
            'FULL_FILLMENT_DEFECT',
            'EXPRESS_DARK_STORE',
            'CROSS_DOCK',
            'SORTING_CENTER',
            'PHARMACY',
            'DISTRIBUTION_CENTER',
            'ORDERS_RECEIVING_POINT',
            'OUTSOURCE_FF',
            'B2B',
            'EXTERNAL_FF'
          ]
        },
        {
          headers: {
            'Client-Id': clientId,
            'Api-Key': ozonToken
          }
        }
      );
      data = response.data;
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить склады Озон по АПИ');
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findMarketplace = await queryRunner.manager.findOne(Marketplaces, {
        where: {
          title: mpTitle
        }
      });
      if (!findMarketplace) {
        this.logger.error(`Не нашел ${mpTitle} в маркетплейсах`);
        return;
      }
      for (const warehouse of data.warehouses) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: {
            marketplaceInternalNumber: String(warehouse.warehouse_id),
            marketplaceId: findMarketplace.id
          }
        });
        if (!findWarehouse) {
          const createWarehouse = queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceInternalNumber: String(warehouse.warehouse_id),
            type: 'FBO',
            marketplaceId: findMarketplace.id
          });
          await queryRunner.manager.save(Warehouses, createWarehouse);
        } else {
          await queryRunner.manager.update(
            Warehouses,
            { id: findWarehouse.id },
            {
              title: warehouse.name,
              marketplaceInternalNumber: String(warehouse.warehouse_id),
              type: 'FBO',
              marketplaceId: findMarketplace.id
            }
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Не смог получить склады FBO ${mpTitle}`);
    } finally {
      await queryRunner.release();
    }
  }
}
