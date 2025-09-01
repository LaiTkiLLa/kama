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

  @Cron(CronExpression.EVERY_6_HOURS)
  async getYandexWarehouses() {
    const yandexToken = await this.configService.get('yandexToken');
    const warehousesUrl = 'https://api.partner.market.yandex.ru/warehouses';
    const { data }: { data: GetYandexWarehouses } = await axios.get(warehousesUrl, {
      headers: {
        'Api-Key': yandexToken
      }
    });
    for (const warehouse of data.result.warehouses) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      try {
        const findWarehouse = await queryRunner.manager.findOne(Warehouses, {
          where: { marketplaceId: String(warehouse.id) }
        });
        if (!findWarehouse) {
          const createWarehouse = queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceId: String(warehouse.id)
          });
          await queryRunner.manager.insert(Warehouses, createWarehouse);
        }
      } catch (error) {
        this.logger.error(error);
        this.logger.error('Не смог получить склады яндекса');
      } finally {
        await queryRunner.release();
      }
    }
  }
}
