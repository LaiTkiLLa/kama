import { Module } from '@nestjs/common';
import { InfoService } from './info.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marketplaces } from './entities/marketplaces.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Marketplaces])],
  providers: [InfoService],
  exports: [InfoService]
})
export class InfoModule {}
