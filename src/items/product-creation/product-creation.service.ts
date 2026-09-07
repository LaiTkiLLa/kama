import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { Items } from '../entities/items.entity';
import { ProductCreationRequests } from '../entities/product-creation-requests.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { CreateItemWb } from '../interfaces/create-item-wb.interface';
import { ProductCreationRequestStatus } from './product-creation-status.enum';
import {
  MARKETPLACE_CARD_PUBLISHERS,
  MarketplaceCardPublisher
} from './publishers/marketplace-card-publisher.interface';
import { AddItemToSupplierDto } from '../dto/add-item-to-supplier.dto';

@Injectable()
export class ProductCreationService {
  private logger: Logger = new Logger(ProductCreationService.name);

  constructor(
    private dataSource: DataSource,
    @Inject(MARKETPLACE_CARD_PUBLISHERS)
    private marketplacePublishers: MarketplaceCardPublisher[]
  ) {}

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
      variants: [{ vendorCode: article, sizes: [{ skus: [] }] }]
    };
  }

  @Cron('0 */1 * * * *')
  async createMpItems() {
    for (const publisher of this.marketplacePublishers) {
      await this.processPublisherRequests(publisher);
    }
  }

  private async processPublisherRequests(publisher: MarketplaceCardPublisher) {
    const requests = await this.dataSource.manager.find(ProductCreationRequests, {
      where: {
        status: ProductCreationRequestStatus.InProgress,
        marketplace: {
          title: publisher.marketplaceTitle
        }
      },
      relations: {
        item: true
      }
    });

    if (!requests.length) {
      return;
    }

    try {
      await publisher.publish(requests);
      await this.dataSource.manager.update(
        ProductCreationRequests,
        { id: In(requests.map(request => request.id)) },
        { status: ProductCreationRequestStatus.Created, lastError: null }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(error);
      this.logger.error(`Не смог создать товар на ${publisher.marketplaceTitle}`);

      await this.dataSource.manager.update(
        ProductCreationRequests,
        { id: In(requests.map(request => request.id)) },
        { status: ProductCreationRequestStatus.Failed, lastError: message }
      );
    }
  }
}
