import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { Warehouses } from './entities/warehouses.entity';
import { Marketplaces } from './entities/marketplaces.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetYandexWarehouses } from './interfaces/yandex-warehouses.interface';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(Marketplaces) private marketplacesRepository: Repository<Marketplaces>,
    private configService: ConfigService,
    private dataSource: DataSource
  ) {}

  async findOrCreateWarehouses(where: FindOptionsWhere<Warehouses>, queryRunner: QueryRunner) {
    let findWarehouse = await queryRunner.manager.findOne(Warehouses, { where });
    if (!findWarehouse) {
      const createData = { title: where.title } as { title: string };
      const createWarehouse = await queryRunner.manager.create(Warehouses, createData);
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
          const createWarehouse = await queryRunner.manager.create(Warehouses, {
            title: warehouse.name,
            marketplaceId: String(warehouse.id)
          });
          await queryRunner.manager.insert(Warehouses, createWarehouse);
        }
      } catch (error) {
      } finally {
        await queryRunner.release();
      }
    }
  }
}
