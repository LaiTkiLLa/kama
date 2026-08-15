import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ItemsSizes } from './items-sizes.entity';
import { ItemsSuppliers } from './items_suppliers.entity';
import { MarketplaceItems } from './marketplace-items.entity';
import { ItemCharacteristics } from './item-characteristics.entity';

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

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  category: string;

  //Свое наименование категории
  @Column({ type: 'varchar', nullable: true, name: 'own_category' })
  ownCategory: string;

  //Консолидация груза
  @Column({ type: 'int', nullable: false, default: 14 })
  consolidation: number;

  //Оплата груза
  @Column({ type: 'int', nullable: false, default: 10 })
  payment: number;

  //Приемка груза фулфилмент
  @Column({ type: 'int', nullable: false, default: 5, name: 'fullfillment_acceptance' })
  fullfillmentAcceptance: number;

  //Приемка груза маркетплейс
  @Column({ type: 'int', nullable: false, default: 10, name: 'marketplace_acceptance' })
  marketplaceAcceptance: number;

  //Буфер
  @Column({ type: 'int', nullable: false, default: 10 })
  buffer: number;

  //Дней доставки до РФ
  @Column({ type: 'int', nullable: false, default: 10, name: 'days_delivery_to_Russia' })
  daysDeliveryToRussia: number;

  //Классификация товара
  @Column({ type: 'varchar', nullable: true })
  classification: string;

  //Размеры факт
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_fact' })
  dimensionsFact: string;

  //Размеры Мастер короба д/ш/в/вес
  @Column({ type: 'varchar', nullable: true, name: 'dimensions_master_box' })
  dimensionsMasterBox: string;

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

  //Виральность товара
  @Column({ type: 'varchar', nullable: true })
  virality: string;

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

  //Метод расчета загрузки
  @Column({ type: 'varchar', nullable: true, name: 'download_calculation_method' })
  downloadCalculationMethod: string;

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

  @OneToMany(() => ItemsSizes, sizes => sizes.item)
  sizes: ItemsSizes[];

  @OneToMany(() => ItemCharacteristics, itemCharacteristic => itemCharacteristic.item)
  itemCharacteristics: ItemCharacteristics[];

  @OneToMany(() => ItemsSuppliers, itemsSuppliers => itemsSuppliers.item)
  itemsSuppliers: ItemsSuppliers[];

  @OneToMany(() => MarketplaceItems, marketplaceItems => marketplaceItems.item)
  marketplaceItems: MarketplaceItems[];
}
