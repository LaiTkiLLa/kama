import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Items } from '../../items/entities/items.entity';
import { Warehouses } from '../../info/entities/warehouses.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';

@Entity({
  name: 'stocks'
})
export class Stocks {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  @Column({ type: 'int', name: 'warehouse_id', nullable: false })
  warehouseId: number;

  @Column({ type: 'int', name: 'current_value', nullable: false, default: 0 })
  currentValue: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  reserved: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  promised: number;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    default: new Date(),
    select: false
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'updated_at',
    default: new Date(),
    select: false
  })
  updatedAt: Date;

  @ManyToOne(() => Items, item => item.stocks)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;

  @ManyToOne(() => Warehouses, warehouse => warehouse.stocks)
  @JoinColumn({
    name: 'warehouse_id'
  })
  warehouse: Warehouses;

  @ManyToOne(() => Marketplaces, marketplace => marketplace.stocks)
  @JoinColumn({
    name: 'marketplace_id'
  })
  marketplace: Marketplaces;
}
