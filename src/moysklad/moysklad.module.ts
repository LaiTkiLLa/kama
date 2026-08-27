import { Module } from '@nestjs/common';
import { MoySkladClient } from './moysklad.client';
import { MoyskladStockService } from './moysklad-stock.service';
import { WbFbsStockPublisher } from './publishers/wb-fbs-stock.publisher';
import { FBS_STOCK_PUBLISHERS } from './publishers/fbs-stock-publisher.interface';

@Module({
  providers: [
    MoySkladClient,
    MoyskladStockService,
    WbFbsStockPublisher,
    {
      provide: FBS_STOCK_PUBLISHERS,
      useFactory: (wb: WbFbsStockPublisher) => [wb],
      inject: [WbFbsStockPublisher]
    }
  ],
  exports: [MoySkladClient, MoyskladStockService]
})
export class MoyskladModule {}
