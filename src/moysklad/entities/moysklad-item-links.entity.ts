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
  name: 'moysklad_item_links'
})
export class MoyskladItemLinks {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'item_id', nullable: false, unique: true })
  itemId: number;

  @Column({ type: 'uuid', name: 'assortment_id', nullable: false })
  assortmentId: string;

  @Column({ type: 'varchar', name: 'assortment_href', nullable: false })
  assortmentHref: string;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: () => 'now()'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: () => 'now()'
  })
  updatedAt: Date;

  @ManyToOne(() => Items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Items;
}
