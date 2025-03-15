import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { InfoModule } from '../info/info.module';

@Module({
  imports: [InfoModule],
  providers: [ItemsService],
  controllers: [ItemsController],
  exports: [ItemsService]
})
export class ItemsModule {}
