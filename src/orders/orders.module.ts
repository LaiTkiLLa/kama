import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ItemsModule } from '../items/items.module';
import { InfoModule } from '../info/info.module';
import { StocksModule } from '../stocks/stocks.module';
import { OrdersController } from './orders.controller';
import { OrdersStatisticsService } from './services/orders-statistics.service';

@Module({
  imports: [ItemsModule, InfoModule, StocksModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersStatisticsService],
  exports: [OrdersStatisticsService]
})
export class OrdersModule {}
