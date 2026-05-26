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
import { Marketplaces } from './marketplaces.entity';

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

  @Column({ type: 'varchar', nullable: true, name: 'marketplace_internal_number' })
  marketplaceInternalNumber: string;

  @Column({ type: 'int', nullable: true, name: 'marketplace_id' })
  marketplaceId: number;

  @Column({
    type: 'varchar',
    default: 'FBO',
    nullable: false
  })
  type: string;

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

  @OneToMany(() => Stocks, stocks => stocks.warehouse)
  stocks: Stocks[];

  @OneToMany(() => Marketplaces, marketplace => marketplace.warehouses)
  marketplace: Marketplaces;

  @OneToMany(() => Orders, orders => orders.warehouse)
  orders: Orders[];
}
