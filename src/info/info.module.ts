import { Module } from '@nestjs/common';
import { InfoService } from './info.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marketplaces } from './entities/marketplaces.entity';
import { InfoController } from './info.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Marketplaces])],
  providers: [InfoService],
  controllers: [InfoController],
  exports: [InfoService]
})
export class InfoModule {}
