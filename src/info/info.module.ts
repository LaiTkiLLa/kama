import { Module } from '@nestjs/common';
import { InfoService } from './info.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marketplaces } from './entities/marketplaces.entity';
import { InfoController } from './info.controller';
import { Banks } from './entities/banks.entity';
import { Suppliers } from './entities/suppliers.entity';
import { Contaminants } from './entities/contaminants.entity';
import { MarketplaceCategories } from './entities/marketplace-categories.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Marketplaces, Banks, Suppliers, Contaminants, MarketplaceCategories])],
  providers: [InfoService],
  controllers: [InfoController],
  exports: [InfoService]
})
export class InfoModule {}
