import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ItemsSuppliers } from './items_suppliers.entity';
import { MarketplaceItems } from './marketplace-items.entity';
import { ItemCharacteristics } from './item-characteristics.entity';
import { ProductCreationRequests } from './product-creation-requests.entity';

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

  //Вид транспорта
  @Column({ type: 'varchar', nullable: true, name: 'transport_type' })
  transportType: string;

  //Метод доставки
  @Column({ type: 'varchar', nullable: true, name: 'delivery_method' })
  deliveryMethod: string;

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

  //Транспортная ставка USD
  @Column({ type: 'float', name: 'transport_rate_usd', nullable: true })
  transportRateUsd: number;

  //Пошлина %
  @Column({ type: 'float', name: 'duty_percentage', nullable: true })
  dutyPercentage: number;

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

  @OneToMany(() => ItemCharacteristics, itemCharacteristic => itemCharacteristic.item)
  itemCharacteristics: ItemCharacteristics[];

  @OneToMany(() => ItemsSuppliers, itemsSuppliers => itemsSuppliers.item)
  itemsSuppliers: ItemsSuppliers[];

  @OneToMany(() => MarketplaceItems, marketplaceItems => marketplaceItems.item)
  marketplaceItems: MarketplaceItems[];

  @OneToMany(() => ProductCreationRequests, request => request.item)
  productCreationRequests: ProductCreationRequests[];
}
