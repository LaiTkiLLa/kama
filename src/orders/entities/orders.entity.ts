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
import { Warehouses } from '../../info/entities/warehouses.entity';
import { Marketplaces } from '../../info/entities/marketplaces.entity';

@Entity({
  name: 'orders'
})
export class Orders {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  //поле finished_price У WB, поле sum у Ozon
  @Column({ type: 'float', nullable: false, default: 0 })
  sum: number;
  //Поля для WB
  @Column({ type: 'float', nullable: false, default: 0, name: 'total_price' })
  totalPrice: number;
  //Поля для WB
  @Column({ type: 'float', nullable: false, default: 0 })
  spp: number;
  //Поля для WB
  @Column({ type: 'float', nullable: false, default: 0, name: 'price_with_disc' })
  priceWithDisc: number;

  @Column({ type: 'varchar', nullable: true, name: 'marketplace_order_identification' })
  marketplaceOrderIdentification: string;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'is_canceled' })
  isCanceled: boolean;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

  @Column({ type: 'int', name: 'warehouse_id', nullable: false })
  warehouseId: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

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

  @ManyToOne(() => Items, item => item.orders)
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;

  @ManyToOne(() => Warehouses, warehouse => warehouse.orders)
  @JoinColumn({
    name: 'warehouse_id'
  })
  warehouse: Warehouses;

  @ManyToOne(() => Marketplaces, marketplace => marketplace.orders)
  @JoinColumn({
    name: 'marketplace_id'
  })
  marketplace: Marketplaces;
}
