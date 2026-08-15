import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { Characteristics } from './characteristics.entity';
import { MarketplaceCharacteristics } from './marketplace-characteristics.entity';

@Entity({
  name: 'marketplace_characteristic_mappings'
})
export class MarketplaceCharacteristicMappings {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  @Column({ type: 'int', name: 'characteristic_id', nullable: false })
  characteristicId: number;

  // FK на marketplace_characteristics.id (внутренний PK), не на внешний ID МП
  @Column({ type: 'int', name: 'marketplace_characteristic_id', nullable: false })
  marketplaceCharacteristicId: number;

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

  @ManyToOne(() => Marketplaces, marketplace => marketplace.marketplaceCharacteristicMappings, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'marketplace_id' })
  marketplace: Marketplaces;

  @ManyToOne(() => Characteristics, characteristic => characteristic.marketplaceCharacteristicMappings, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'characteristic_id' })
  characteristic: Characteristics;

  @ManyToOne(
    () => MarketplaceCharacteristics,
    marketplaceCharacteristic => marketplaceCharacteristic.marketplaceCharacteristicMappings,
    {
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'marketplace_characteristic_id' })
  marketplaceCharacteristic: MarketplaceCharacteristics;
}
