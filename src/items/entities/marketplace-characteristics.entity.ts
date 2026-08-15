import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { MarketplaceItemCharacteristics } from './marketplace-item-characteristics.entity';
import { MarketplaceCharacteristicMappings } from './marketplace-characteristic-mappings.entity';

@Entity({
  name: 'marketplace_characteristics'
})
export class MarketplaceCharacteristics {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  // Внешний ID характеристики у маркетплейса (WB characteristics[].id, Ozon attributes[].id)
  @Column({ type: 'varchar', name: 'marketplace_characteristic_id', nullable: false })
  marketplaceCharacteristicId: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: () => 'now()'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: () => 'now()'
  })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'deleted_at'
  })
  deletedAt: Date | null;

  @ManyToOne(() => Marketplaces, marketplace => marketplace.marketplaceCharacteristics, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'marketplace_id' })
  marketplace: Marketplaces;

  @OneToMany(
    () => MarketplaceItemCharacteristics,
    marketplaceItemCharacteristic => marketplaceItemCharacteristic.marketplaceCharacteristic
  )
  marketplaceItemCharacteristics: MarketplaceItemCharacteristics[];

  @OneToMany(() => MarketplaceCharacteristicMappings, mapping => mapping.marketplaceCharacteristic)
  marketplaceCharacteristicMappings: MarketplaceCharacteristicMappings[];
}
