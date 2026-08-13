import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { Warehouses } from './warehouses.entity';
import { MarketplaceItems } from '../../items/entities/marketplace-items.entity';
import { OrdersV2 } from 'src/orders/entities/orders_v2.entity';

@Entity({
  name: 'marketplaces'
})
export class Marketplaces {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    type: 'varchar',
    nullable: false
  })
  title: string;

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

  @OneToMany(() => MarketplaceItems, items => items.marketplace)
  marketplaceItems: MarketplaceItems[];

  @OneToMany(() => Stocks, stocks => stocks.marketplace)
  stocks: Stocks[];

  @OneToMany(() => OrdersV2, orders => orders.marketplace)
  orders: OrdersV2[];

  @OneToMany(() => Warehouses, warehouse => warehouse.marketplace)
  warehouses: Warehouses[];
}
