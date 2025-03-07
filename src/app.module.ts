import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from './configuration';
import { ItemsModule } from './items/items.module';
import { OrdersModule } from './orders/orders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StocksModule } from './stocks/stocks.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): Promise<TypeOrmModuleOptions> =>
        // @ts-ignore
        configService.get('database'),
      inject: [ConfigService]
    }),
    ItemsModule,
    OrdersModule,
    StocksModule
  ]
})
export class AppModule {}
