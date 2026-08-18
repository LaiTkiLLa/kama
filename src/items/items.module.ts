import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { InfoModule } from '../info/info.module';
import { ProductCreationService } from './product-creation/product-creation.service';
import { WbCardPublisher } from './product-creation/publishers/wb-card-publisher.service';
import { MARKETPLACE_CARD_PUBLISHERS } from './product-creation/publishers/marketplace-card-publisher.interface';

@Module({
  imports: [InfoModule],
  providers: [
    ItemsService,
    ProductCreationService,
    WbCardPublisher,
    {
      provide: MARKETPLACE_CARD_PUBLISHERS,
      useFactory: (wbCardPublisher: WbCardPublisher) => [wbCardPublisher],
      inject: [WbCardPublisher]
    }
  ],
  controllers: [ItemsController],
  exports: [ItemsService]
})
export class ItemsModule {}
