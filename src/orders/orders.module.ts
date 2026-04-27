import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ItemsModule } from '../items/items.module';
import { InfoModule } from '../info/info.module';
import { StocksModule } from '../stocks/stocks.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [ItemsModule, InfoModule, StocksModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
