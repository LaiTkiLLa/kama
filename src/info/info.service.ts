import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, QueryRunner } from 'typeorm';
import { Warehouses } from './entities/warehouses.entity';
import { Marketplaces } from './entities/marketplaces.entity';

@Injectable()
export class InfoService {
  constructor() {}

  async findOrCreateWarehouses(where: { title: string }, queryRunner: QueryRunner) {
    let findWarehouse = await queryRunner.manager.findOne(Warehouses, { where });
    if (!findWarehouse) {
      const createWarehouse = await queryRunner.manager.create(Warehouses, { title: where.title });
      findWarehouse = await queryRunner.manager.save(Warehouses, createWarehouse);
    }
    return findWarehouse;
  }

  async findMarketplace(
    where: FindOptionsWhere<Marketplaces>,
    queryRunner: QueryRunner
  ): Promise<Marketplaces> {
    const findMarketplace = await queryRunner.manager.findOne(Marketplaces, {
      where
    });
    if (!findMarketplace) {
      throw new NotFoundException('Маркетплейс не найден');
    }
    return findMarketplace;
  }
}
