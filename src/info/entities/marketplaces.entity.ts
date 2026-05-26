import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Items } from '../../items/entities/items.entity';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { Orders } from '../../orders/entities/orders.entity';
import { Warehouses } from './warehouses.entity';

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

  @OneToMany(() => Items, items => items.marketplace)
  items: Items[];

  @OneToMany(() => Stocks, stocks => stocks.marketplace)
  stocks: Stocks[];

  @OneToMany(() => Orders, orders => orders.marketplace)
  orders: Orders[];

  @OneToMany(() => Warehouses, warehouses => warehouses.marketplace)
  warehouses: Warehouses[];
}
