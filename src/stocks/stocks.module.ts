import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { ItemsModule } from '../items/items.module';
import { InfoModule } from '../info/info.module';

@Module({
  imports: [ItemsModule, InfoModule],
  providers: [StocksService]
})
export class StocksModule {}
