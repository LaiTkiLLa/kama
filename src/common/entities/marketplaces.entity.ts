import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Items } from '../../items/entities/items.entity';

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

  @OneToMany(() => Items, items => items.marketPlace)
  items: Items[];
}
