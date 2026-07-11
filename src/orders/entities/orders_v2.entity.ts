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
  name: 'orders_v2'
})
export class OrdersV2 {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: true, name: 'marketplace_order_identification' })
  marketplaceOrderIdentification: string;

  @Column({ type: 'varchar', nullable: true, name: 'marketplace_order_number' })
  marketplaceOrderNumber: string;

  @Column({ type: 'varchar', nullable: true, name: 'marketplace_order_posting_number' })
  marketplaceOrderPostingNumber: string;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  //Ozon Цена товара с учётом акций, кроме акций за счёт Ozon.
  //У WB это цена с учетом всех скидок, кроме суммы по WB Кошельку finishedPrice
  //Сколько выплатят продавцу Yandex (сумма payment и subsidy)
  @Column({ type: 'float', nullable: true })
  price: number;

  //Цена до учёта скидок. На карточке товара отображается зачёркнутой.
  @Column({ type: 'float', nullable: true, name: 'old_price' })
  oldPrice: number;

  //Выплата продавцу Ozon.
  //У WB совпадает с finishedPrice
  //Сколько выплатят продавцу Yandex (сумма payment и subsidy)
  @Column({ type: 'float', nullable: true })
  payout: number;

  //Сумма скидки.
  @Column({ type: 'float', nullable: true, name: 'discount_value' })
  discountValue: number;

  //Процент скидки
  @Column({ type: 'float', nullable: true, name: 'discount_percent' })
  discountPercent: number;

  //Процент комиссии
  @Column({ type: 'float', nullable: true, name: 'commission_percent' })
  commissionPercent: number;

  //Значение комиссии OZON
  //SPP у WB
  @Column({ type: 'float', nullable: true, name: 'commission_value' })
  commissionValue: number;

  //Город доставки
  @Column({ type: 'varchar', nullable: true })
  city: string;

  //Из какого кластера отправляют
  @Column({ type: 'varchar', nullable: true, name: 'cluster_from' })
  clusterFrom: string;

  //Из какого кластера отправляют
  @Column({ type: 'varchar', nullable: true, name: 'cluster_to' })
  clusterTo: string;

  @Column({ type: 'int', nullable: true, name: 'cancel_reason_id' })
  cancelReasonId: number;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

  @Column({ type: 'int', name: 'warehouse_id', nullable: false })
  warehouseId: number;

  @Column({ type: 'int', name: 'marketplace_id', nullable: false })
  marketplaceId: number;

  //Указано в 0 часом поясе, для Москвы нужно +3 часа
  @Column({ type: 'timestamptz', name: 'marketplace_created_at', nullable: true })
  marketplaceCreatedAt: Date;

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
