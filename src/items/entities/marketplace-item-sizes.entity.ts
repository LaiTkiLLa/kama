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

@Entity({
  name: 'marketplace_item_sizes'
})
export class MarketplaceItemSizes {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'marketplace_item_id', nullable: false })
  marketplaceItemId: number;

  // Идентификатор размера у маркетплейса (WB chrtID); не глобально уникален
  @Column({ type: 'varchar', name: 'marketplace_size_id', nullable: false })
  marketplaceSizeId: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  value: string | null;

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

  @ManyToOne(() => MarketplaceItems, marketplaceItem => marketplaceItem.marketplaceItemSizes, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'marketplace_item_id' })
  marketplaceItem: MarketplaceItems;
}
