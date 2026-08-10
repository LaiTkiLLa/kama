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
import { MarketplaceItems } from '../../items/entities/marketplace-items.entity';

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

  //Без учета reserved и promised
  @Column({ type: 'int', name: 'current_value', nullable: false, default: 0 })
  currentValue: number;

  //Для WB Это сколько едет к клиентам
  @Column({ type: 'int', nullable: false, default: 0 })
  reserved: number;

  //Для WB это сколько едет от клиентов
  @Column({ type: 'int', nullable: false, default: 0 })
  promised: number;

  @Column({ type: 'int', name: 'marketplace_item_id', nullable: true })
  marketplaceItemId: number;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'created_at',
    default: new Date()
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'updated_at',
    default: new Date()
  })
  updatedAt: Date;

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

  @ManyToOne(() => MarketplaceItems, marketplaceItem => marketplaceItem.stocks)
  @JoinColumn({
    name: 'marketplace_item_id'
  })
  marketplaceItem: MarketplaceItems;
}
