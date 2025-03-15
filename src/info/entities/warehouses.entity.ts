import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { Orders } from '../../orders/entities/orders.entity';

@Entity({
  name: 'warehouses'
})
export class Warehouses {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  title: string;

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

  @OneToMany(() => Stocks, stocks => stocks.warehouse)
  stocks: Stocks[];

  @OneToMany(() => Orders, orders => orders.warehouse)
  orders: Orders[];
}
