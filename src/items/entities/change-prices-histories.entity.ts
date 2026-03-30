import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Items } from './items.entity';

@Entity({
  name: 'change_prices_histories'
})
export class ChangePricesHistories {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    name: 'item_id',
    type: 'int',
    nullable: false
  })
  itemId: number;

  @Column({
    name: 'old_price',
    type: 'float',
    nullable: true
  })
  oldPrice: number;

  @Column({
    name: 'new_price',
    type: 'float',
    nullable: true
  })
  newPrice: number;

  @Column({
    name: 'old_discount',
    type: 'float',
    nullable: true
  })
  oldDiscount: number;

  @Column({
    name: 'new_discount',
    type: 'float',
    nullable: true
  })
  newDiscount: number;

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

  @ManyToOne(() => Items, item => item.priceHistories)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;
}
