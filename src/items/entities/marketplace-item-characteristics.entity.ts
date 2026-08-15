import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { MarketplaceItems } from './marketplace-items.entity';
import { MarketplaceCharacteristics } from './marketplace-characteristics.entity';

@Entity({
  name: 'marketplace_item_characteristics'
})
export class MarketplaceItemCharacteristics {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'marketplace_item_id', nullable: false })
  marketplaceItemId: number;

  // FK на marketplace_characteristics.id (внутренний PK)
  @Column({ type: 'int', name: 'marketplace_characteristic_id', nullable: false })
  marketplaceCharacteristicId: number;

  @Column({ type: 'varchar', nullable: false })
  value: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

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

  @ManyToOne(() => MarketplaceItems, marketplaceItem => marketplaceItem.marketplaceItemCharacteristics, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'marketplace_item_id' })
  marketplaceItem: MarketplaceItems;

  @ManyToOne(
    () => MarketplaceCharacteristics,
    marketplaceCharacteristic => marketplaceCharacteristic.marketplaceItemCharacteristics,
    {
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'marketplace_characteristic_id' })
  marketplaceCharacteristic: MarketplaceCharacteristics;
}
