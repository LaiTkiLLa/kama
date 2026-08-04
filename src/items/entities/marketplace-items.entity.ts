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
import { Items } from './items.entity';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { OrdersV2 } from '../../orders/entities/orders_v2.entity';

@Entity({
  name: 'marketplace_items'
})
export class MarketplaceItems {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ name: 'item_id', nullable: false, type: 'int' })
  itemId: number;

  @Column({ type: 'varchar', nullable: false, name: 'marketplace_identifier' })
  marketplaceIdentifier: string;

  @Column({ type: 'varchar', nullable: false })
  barcode: string;

  @Column({ type: 'varchar', nullable: false })
  sku: string;

  //Размеры д/ш/в/вес
  @Column({ type: 'varchar', nullable: true })
  dimensions: string;

  //Объем
  @Column({ type: 'varchar', nullable: true })
  volume: string;

  //Что то вроде id размера, нужен для получения остатков по FBS
  @Column({ type: 'varchar', nullable: true, name: 'chrt_id' })
  chrtId: string;

  @Column({ type: 'int', nullable: false, name: 'marketplace_id' })
  marketplaceId: number;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: new Date()
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: new Date()
  })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'deleted_at'
  })
  deletedAt: Date;

  @ManyToOne(() => Marketplaces, marketplace => marketplace.marketplaceItems)
  @JoinColumn({
    name: 'marketplace_id'
  })
  marketplace: Marketplaces;

  @ManyToOne(() => Items, item => item.marketplaceItems)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;

  @OneToMany(() => Stocks, stocks => stocks.marketplaceItem)
  stocks: Stocks[];

  @OneToMany(() => OrdersV2, orders => orders.marketplaceItem)
  orders: OrdersV2[];
}
