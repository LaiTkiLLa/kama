import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Stocks } from '../../stocks/entities/stocks.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';
import { Orders } from '../../orders/entities/orders.entity';
import { Directions } from '../../info/entities/directions.entity';
import { Statuses } from '../../info/entities/statuses.entity';
import { Suppliers } from '../../info/entities/suppliers.entity';

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

  //Свое наименование категории
  @Column({ type: 'varchar', nullable: true, name: 'own_category' })
  ownCategory: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'varchar', nullable: false })
  barcode: string;

  @Column({ type: 'varchar', nullable: false })
  sku: string;

  @Column({ type: 'varchar', nullable: true })
  color: string;

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

  @Column({ type: 'int', name: 'send_status_id', nullable: true })
  sendStatusId: number;

  @Column({ type: 'int', name: 'direction_id', nullable: false })
  directionId: number;

  @Column({ type: 'int', name: 'supplier_id', nullable: true })
  supplierId: number | null;

  //Классификация товара
  @Column({ type: 'varchar', nullable: true })
  classification: string

  //Кратность товара
  @Column({ type: 'varchar', nullable: true })
  multiplicity: string

  //Номер короба
  @Column({ type: 'varchar', nullable: true, name: 'box_number' })
  boxNumber: string

  //Размеры факт
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_fact' })
  dimensionsFact: string

  //Размеры WB д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_wb' })
  dimensionsWB: string

  //Размеры Ozon
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_ozon' })
  dimensionsOzon: string

  //Объем товара
  @Column({ type: 'varchar', nullable: true })
  volume: string

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

  @ManyToOne(() => Marketplaces, marketplace => marketplace.items)
  @JoinColumn({
    name: 'marketplace_id'
  })
  marketplace: Marketplaces;

  @OneToMany(() => Stocks, stocks => stocks.item)
  stocks: Stocks[];

  @OneToMany(() => Orders, orders => orders.item)
  orders: Orders[];

  @ManyToOne(() => Directions, direction => direction.items)
  @JoinColumn({
    name: 'direction_id'
  })
  direction: Directions;

  @ManyToOne(() => Suppliers, supplier => supplier.items)
  @JoinColumn({
    name: 'supplier_id'
  })
  supplier: Suppliers;

  @ManyToOne(() => Statuses, sendStatus => sendStatus.items)
  @JoinColumn({
    name: 'send_status_id'
  })
  sendStatus: Statuses;
}
