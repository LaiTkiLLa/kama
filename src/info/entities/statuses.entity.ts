import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { StatusesTypes } from '../enum/statuses.enum';
import { MarketplaceItems } from 'src/items/entities/marketplace-items.entity';

@Entity({
  name: 'statuses'
})
export class Statuses {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    type: 'varchar',
    nullable: false
  })
  title: string;

  @Column({
    type: 'varchar',
    nullable: false
  })
  type: StatusesTypes;

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

  @OneToMany(() => MarketplaceItems, itemsMarketplace => itemsMarketplace.sendStatus)
  itemsMarketplace: MarketplaceItems[];
}
