import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { Warehouses } from './entities/warehouses.entity';
import { Marketplaces } from './entities/marketplaces.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InfoService {
  constructor(@InjectRepository(Marketplaces) private marketplacesRepository: Repository<Marketplaces>) {}

  async findOrCreateWarehouses(where: { title: string }, queryRunner: QueryRunner) {
    let findWarehouse = await queryRunner.manager.findOne(Warehouses, { where });
    if (!findWarehouse) {
      const createWarehouse = await queryRunner.manager.create(Warehouses, { title: where.title });
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
}
