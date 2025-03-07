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



  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'createdAt',
    default: new Date(),
    select: false
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'updatedAt',
    default: new Date(),
    select: false
  })
  updatedAt: Date;

  @ManyToOne(() => Items, item => item.stocks)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;

}
