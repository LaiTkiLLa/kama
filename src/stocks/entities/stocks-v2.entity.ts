import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Warehouses } from '../../info/entities/warehouses.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { MarketplaceItemSizes } from '../../items/entities/marketplace-item-sizes.entity';

@Entity({
  name: 'stocks_v2'
})
export class StocksV2 {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  @Column({ type: 'int', name: 'warehouse_id', nullable: false })
  warehouseId: number;

  @Column({ type: 'int', name: 'marketplace_item_size_id', nullable: false })
  marketplaceItemSizeId: number;

  // Без учета reserved и promised
  @Column({ type: 'int', name: 'current_value', nullable: false, default: 0 })
  currentValue: number;

  // Для WB: сколько едет к клиентам
  @Column({ type: 'int', nullable: false, default: 0 })
  reserved: number;

  // Для WB: сколько едет от клиентов
  @Column({ type: 'int', nullable: false, default: 0 })
  promised: number;

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

  @ManyToOne(() => Warehouses, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'warehouse_id'
  })
  warehouse: Warehouses;

  @ManyToOne(() => Marketplaces)
  @JoinColumn({
    name: 'marketplace_id'
  })
  marketplace: Marketplaces;

  @ManyToOne(() => MarketplaceItemSizes, size => size.stocksV2, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'marketplace_item_size_id'
  })
  marketplaceItemSize: MarketplaceItemSizes;
}
