import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { Items } from '../entities/items.entity';
import { ProductCreationRequests } from '../entities/product-creation-requests.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { CreateItemWb } from '../interfaces/create-item-wb.interface';
import { ProductCreationRequestStatus } from './product-creation-status.enum';

@Injectable()
export class ProductCreationService {
  private logger: Logger = new Logger(ProductCreationService.name);

  constructor(private dataSource: DataSource) {}

  async createProduct(createProductDto: CreateProductDto) {
    const article = createProductDto.article.trim();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const findItem = await queryRunner.manager.findOne(Items, {
        where: { article, createdForCalculation: false }
      });
      if (findItem) {
        throw new BadRequestException('Товар уже существует');
      }
      const createItem = await queryRunner.manager.save(
        Items,
        queryRunner.manager.create(Items, {
          article,
          articleOld: article,
          createdForCalculation: false
        })
      );

      const marketplaces = await queryRunner.manager.find(Marketplaces);
      for (const marketplace of marketplaces) {
        await queryRunner.manager.save(
          ProductCreationRequests,
          queryRunner.manager.create(ProductCreationRequests, {
            itemId: createItem.id,
            marketplaceId: marketplace.id,
            status: ProductCreationRequestStatus.InProgress,
            payload:
              marketplace.title === 'WB' ? this.buildWbPayload(article, createProductDto.wb.subjectID) : {}
          })
        );
      }
      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (!(error instanceof BadRequestException)) {
        this.logger.error(error);
        this.logger.error(`Не смог поставить создание товара ${article} в outbox`);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private buildWbPayload(article: string, subjectID: number): CreateItemWb {
    return {
      subjectID,
      variants: [{ vendorCode: article }]
    };
  }
}
