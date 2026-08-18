import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { InfoModule } from '../info/info.module';
import { ProductCreationService } from './product-creation/product-creation.service';

@Module({
  imports: [InfoModule],
  providers: [ItemsService, ProductCreationService],
  controllers: [ItemsController],
  exports: [ItemsService]
})
export class ItemsModule {}
