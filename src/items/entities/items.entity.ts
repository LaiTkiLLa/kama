import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';

@Entity({
  name: 'items'
})
export class Items {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  article: string;

  @Column({ type: 'varchar', nullable: false })
  category: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'varchar', nullable: false })
  barcode: string;

  @Column({ type: 'varchar', nullable: false, name: 'marketplace_identifier' })
  marketplaceIdentifier: string;

  //Срок производства
  @Column({ type: 'int', nullable: false, default: 30, name: 'production_time' })
  productionTime: number;

  //Срок сборки заказа
  @Column({ type: 'int', nullable: false, default: 7, name: 'assembly_period' })
  assemblyPeriod: number;

  //Срок доставки
  @Column({ type: 'int', nullable: false, default: 35, name: 'delivery_time' })
  deliveryTime: number;

  //Срок отгрузки на МП
  @Column({ type: 'int', nullable: false, default: 10, name: 'shipping_period' })
  shippingPeriod: number;

  @Column({ type: 'varchar', nullable: false, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'int', nullable: false, name: 'marketplace_id' })
  marketplaceId: number;

  @ManyToOne(() => Marketplaces, marketPlace => marketPlace.items)
  marketPlace: Marketplaces;

  @OneToMany(() => Stocks, stocks => stocks.item)
  stocks: Stocks[];

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
}
