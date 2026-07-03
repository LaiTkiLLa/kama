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
  name: 'items_sizes'
})
export class ItemsSizes {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

  //Что то вроде id размера, нужен для получения остатков по FBS
  @Column({ type: 'varchar', nullable: true, name: 'chrt_id' })
  chrtId: string;

  @Column({ type: 'varchar', nullable: true, name: 'tech_size' })
  techSize: string;

  @Column({ type: 'varchar', nullable: true, name: 'wb_size' })
  wbSize: string;

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

  @ManyToOne(() => Items, item => item.sizes)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;
}
