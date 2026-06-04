import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { Warehouses } from './entities/warehouses.entity';
import { Marketplaces } from './entities/marketplaces.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetYandexWarehouses } from './interfaces/yandex-warehouses.interface';
import { Directions } from './entities/directions.entity';
import { Statuses } from './entities/statuses.entity';
import { GetStatusesListDto } from './dto/get-statuses-list.dto';
import { GetWbWarehouses } from './interfaces/wb-warehouses.interface';
import { OzonWarehouses } from './interfaces/ozon-warehouses.interface';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(Marketplaces) private marketplacesRepository: Repository<Marketplaces>,
    private configService: ConfigService,
    private dataSource: DataSource
  ) {}

  private logger: Logger = new Logger(InfoService.name);

  async findOrCreateWarehouses(where: FindOptionsWhere<Warehouses>, queryRunner: QueryRunner) {
    let findWarehouse = await queryRunner.manager.findOne(Warehouses, { where });
    if (!findWarehouse) {
      const createData = { title: where.title } as { title: string };
      const createWarehouse = queryRunner.manager.create(Warehouses, createData);
      findWarehouse = await queryRunner.manager.save(Warehouses, createWarehouse);
    }
    return findWarehouse;
  }

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

  async getSuppliersList() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const findSuppliers = await queryRunner.manager.find(Statuses, {});
      return findSuppliers.map(supplier => ({
        id: supplier.id,
        title: supplier.title
      }));
    } catch (error) {
      this.logger.error(error);
      this.logger.error('Не смог получить список поставщиков');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findDirection(queryRunner: QueryRunner, where: FindOptionsWhere<Directions>) {
    const findDirection = await queryRunner.manager.findOne(Directions, { where });
    if (!findDirection) {
      throw new NotFoundException('Направление не найдено');
    }
    return findDirection;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async getYandexWarehouses() {
    const yandexToken = await this.configService.get('yandexToken');
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
          title: 'Yandex'
        }
      });
      if (!findMarketplace) {
        this.logger.error('Не нашел Yandex в маркетплейсах');
        return;
      }
      for (const warehouse of data.result.warehouses) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: String(warehouse.id) }
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
      this.logger.error('Не смог получить склады яндекса');
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async getWbOwnWarehouses() {
    const apiToken = await this.configService.get('wbToken');
    const warehousesUrl = 'https://marketplace-api.wildberries.ru/api/v3/warehouses';
    const { data }: { data: GetWbWarehouses[] } = await axios.get(warehousesUrl, {
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
      for (const warehouse of data) {
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
  async getOzonWarehouses() {
    let data: OzonWarehouses;
    try {
      const ozonToken = await this.configService.get('ozonToken');
      const clientId = await this.configService.get('ozonClientId');
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
          title: 'Озон'
        }
      });
      if (!findMarketplace) {
        this.logger.error('Не нашел Озон в маркетплейсах');
        return;
      }
      for (const warehouse of data.warehouses) {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceInternalNumber: String(warehouse.warehouse_id) }
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
          queryRunner.manager.update(
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
      this.logger.error('Не смог получить склады FBO Ozon');
    } finally {
      await queryRunner.release();
    }
  }
}
