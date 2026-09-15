import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { ItemsModule } from '../items/items.module';
import { InfoModule } from '../info/info.module';
import { StocksController } from './stocks.controller';
import { StocksStatisticsService } from './services/stocks-statistics.service';

@Module({
  imports: [ItemsModule, InfoModule],
  controllers: [StocksController],
  providers: [StocksService, StocksStatisticsService],
  exports: [StocksService, StocksStatisticsService]
})
export class StocksModule {}
