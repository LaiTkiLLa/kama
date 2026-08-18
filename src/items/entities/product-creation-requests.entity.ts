import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Items } from './items.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { MarketplaceItems } from './marketplace-items.entity';
import { ProductCreationRequestStatus } from '../product-creation/product-creation-status.enum';

@Entity({
  name: 'product_creation_requests'
})
export class ProductCreationRequests {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  @Column({ type: 'varchar', nullable: false })
  status: ProductCreationRequestStatus;

  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, unknown>;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'int', name: 'marketplace_item_id', nullable: true })
  marketplaceItemId: number | null;

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

  @ManyToOne(() => Items, item => item.productCreationRequests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Items;

  @ManyToOne(() => Marketplaces, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'marketplace_id' })
  marketplace: Marketplaces;

  @OneToOne(() => MarketplaceItems, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'marketplace_item_id' })
  marketplaceItem: MarketplaceItems | null;
}
