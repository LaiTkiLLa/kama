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
import { ChangePricesHistories } from './change-prices-histories.entity';

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

  @Column({ type: 'varchar', nullable: false, name: 'article_old' })
  articleOld: string;

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

  //Срок планирования устаревшее удалить потом
  @Column({ type: 'int', nullable: false, default: 120, name: 'plan_time' })
  planTime: number;

  //Срок производства и сборки заказа устаревшее удалить потом
  @Column({ type: 'int', nullable: false, default: 35, name: 'production_and_assembly_time' })
  productionAndAssemblyTime: number;

  //Срок доставки устаревшее удалить потом
  @Column({ type: 'int', nullable: false, default: 35, name: 'delivery_time' })
  deliveryTime: number;

  //Срок отгрузки на МП устаревшее удалить потом
  @Column({ type: 'int', nullable: false, default: 10, name: 'shipping_period' })
  shippingPeriod: number;

  //Консолидация груза
  @Column({ type: 'int', nullable: false, default: 14 })
  consolidation: number;

  //Оплата груза
  @Column({ type: 'int', nullable: false, default: 10 })
  payment: number;

  //Сборка груза
  @Column({ type: 'int', nullable: false, default: 5 })
  assembling: number;

  //Приемка груза фулфилмент
  @Column({ type: 'int', nullable: false, default: 5, name: 'fullfillment_acceptance' })
  fullfillmentAcceptance: number;

  //Приемка груза маркетплейс
  @Column({ type: 'int', nullable: false, default: 10, name: 'marketplace_acceptance' })
  marketplaceAcceptance: number;

  //Производство товара
  @Column({ type: 'int', nullable: false, default: 10 })
  production: number;

  //Буфер
  @Column({ type: 'int', nullable: false, default: 10 })
  buffer: number;

  //@TODO УДАЛИТЬ
  //Плановая оборачиваемость
  @Column({ type: 'int', nullable: false, default: 90, name: 'planned_turnover' })
  plannedTurnover: number;

  //Дней доставки до РФ
  @Column({ type: 'int', nullable: false, default: 10, name: 'days_delivery_to_Russia' })
  daysDeliveryToRussia: number;

  @Column({ type: 'varchar', nullable: true, name: 'image_url' })
  imageUrl: string | null;

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
  classification: string;

  //Кратность товара
  @Column({ type: 'varchar', nullable: true })
  multiplicity: string;

  //Номер короба
  @Column({ type: 'varchar', nullable: true, name: 'box_number' })
  boxNumber: string;

  //Размеры факт
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_fact' })
  dimensionsFact: string;

  //Размеры WB д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_wb' })
  dimensionsWB: string;

  //Размеры Ozon д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_ozon' })
  dimensionsOzon: string;

  //Размеры Yandex д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_yandex' })
  dimensionsYandex: string;

  //Размеры Мастер короба д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_master_box' })
  dimensionsMasterBox: string;

  //Объем WB
  @Column({ type: 'varchar', nullable: true, name: 'volume_wb' })
  volumeWB: string;

  //Цена товара на WB
  @Column({ type: 'float', nullable: true, name: 'price_wb' })
  priceWb: number;

  //% скидки товара на WB
  @Column({ type: 'float', nullable: true, name: 'discount_wb' })
  discountWb: number;

  //Цена товара на Ozon
  @Column({ type: 'float', nullable: true, name: 'price_ozon' })
  priceOzon: number;

  //Цена товара по акции на Ozon
  @Column({ type: 'float', nullable: true, name: 'price_with_discount_ozon' })
  priceWithDiscountOzon: number;

  //Объем Ozon
  @Column({ type: 'varchar', nullable: true, name: 'volume_ozon' })
  volumeOzon: string;

  //Объем Yandex
  @Column({ type: 'varchar', nullable: true, name: 'volume_yandex' })
  volumeYandex: string;

  //Объем Мастер короба
  @Column({ type: 'varchar', nullable: true, name: 'volume_master_box' })
  volumeMasterBox: string;

  //Объем товара
  @Column({ type: 'varchar', nullable: true })
  volume: string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'is_archive'
  })
  isArchive: boolean;

  //Запас в днях Возможно надо будет удалить
  @Column({ type: 'int', name: 'stocks_in_days', nullable: false, default: 30 })
  stocksInDays: number;

  //Себестоимость в юанях
  @Column({ type: 'float', name: 'cost_in_yuan', nullable: true })
  costInYuan: number;

  //Себестоимость в юанях белая
  @Column({ type: 'float', name: 'cost_in_yuan_white', nullable: true })
  costInYuanWhite: number;

  //Себестоимость в рублях
  @Column({ type: 'float', name: 'cost_in_rub', nullable: true })
  costInRub: number;

  //КОД ТНВЭД
  @Column({ type: 'varchar', name: 'cost_tnved', nullable: true })
  codeTNVED: string;

  //Срок пополнения в днях
  @Column({ type: 'int', name: 'replenishment_period', nullable: false, default: 60 })
  replenishmentPeriod: number;

  //Норматив остатков на ФФ + МП днях
  @Column({ type: 'int', name: 'remaining_balance', nullable: false, default: 60 })
  remainingBalance: number;

  //Частота отправки ТС в днях
  @Column({ type: 'int', name: 'frequency_of_sending_cars', nullable: false, default: 7 })
  frequencyOfSendingCars: number;

  //Дневной процент роста
  @Column({ type: 'float', name: 'daily_growth_percentage', nullable: true })
  dailyGrowthPercentage: number;

  //Объем на единицу
  @Column({ type: 'float', name: 'volume_per_unit', nullable: true })
  volumePerUnit: number;

  //Вес на единицу
  @Column({ type: 'float', name: 'weight_per_unit', nullable: true })
  weightPerUnit: number;

  //Транспортная ставка USD
  @Column({ type: 'float', name: 'transport_rate_usd', nullable: true })
  transportRateUsd: number;

  //Пошлина %
  @Column({ type: 'float', name: 'duty_percentage', nullable: true })
  dutyPercentage: number;

  //Плотность
  @Column({ type: 'float', nullable: true })
  density: number;

  //Тарифный вес
  @Column({ type: 'varchar', name: 'tariff_weight', nullable: true })
  tariffWeight: string;

  //Тип расчета стоимости
  @Column({ type: 'varchar', name: 'cost_calculation_type', nullable: true })
  costCalculationType: string;

  //Тип расчета
  @Column({ type: 'varchar', name: 'calculation_type', nullable: true })
  calculationType: string;

  //Сезонность для вывоза
  @Column({ type: 'float', name: 'seasonality_for_export', nullable: true })
  seasonalityForExport: number;

  //Сезонность для заказа
  @Column({ type: 'float', name: 'seasonality_for_order', nullable: true })
  seasonalityForOrder: number;

  //Виральность товара
  @Column({ type: 'varchar', nullable: true })
  virality: string;

  //Минимальный заказ у поставщика
  @Column({
    type: 'int',
    name: 'supplier_minimum_order',
    nullable: true
  })
  supplierMinimumOrder: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'created_for_calculation'
  })
  createdForCalculation: boolean;

  //Дата создания товара на WB
  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'wb_created_at'
  })
  wbCreatedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'own_images_url' })
  ownImagesUrl: string | null;

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

  @OneToMany(() => ChangePricesHistories, priceHistories => priceHistories.item)
  priceHistories: ChangePricesHistories[];
}
