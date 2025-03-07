import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [ItemsModule],
  providers: [StocksService]
})
export class StocksModule {}
