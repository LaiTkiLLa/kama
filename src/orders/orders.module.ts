import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ItemsModule } from '../items/items.module';
import { InfoModule } from '../info/info.module';

@Module({
  imports: [ItemsModule, InfoModule],
  providers: [OrdersService]
})
export class OrdersModule {}
