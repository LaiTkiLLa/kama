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
import { ItemsSuppliers } from '../../items/entities/items_suppliers.entity';
import { Banks } from './banks.entity';

@Entity({
  name: 'suppliers'
})
export class Suppliers {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  //Название поставщика
  @Column({
    type: 'varchar',
    nullable: false
  })
  title: string;

  //Контакт c поставщиков
  @Column({
    type: 'varchar',
    nullable: true
  })
  contact: string;

  //Договор c поставщиков
  @Column({
    type: 'varchar',
    nullable: true
  })
  contract: string;

  //Условия оплат
  @Column({
    type: 'text',
    nullable: true,
    name: 'payment_terms'
  })
  paymentTerms: string;

  //Тип взаиморасчетов
  @Column({
    type: 'text',
    nullable: true,
    name: 'type_of_mutual_settlements'
  })
  typeOfMutualSettlements: string;

  //Юридическое название
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'legal_title'
  })
  legalTitle: string;

  //Юридический адрес
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'legal_address'
  })
  legalAddress: string;

  //Расчетный счет
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'acc_raschet'
  })
  accRaschet: string;

  @Column({
    type: 'int',
    nullable: true,
    name: 'bank_id'
  })
  bankId: number;

  //Рейтинг надежности
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'reliability_rating'
  })
  reliabilityRating: string;

  //Адрес склада
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'warehouse_address'
  })
  warehouseAddress: string;

  //Ответственный сотрудник
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'responsible_employee'
  })
  responsibleEmployee: string;

  //Комментарий
  @Column({
    type: 'varchar',
    nullable: true
  })
  comment: string;

  //Кредитный лимит
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'credit_limit'
  })
  creditLimit: string;

  //Можно ли хранить в складе
  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'can_be_able_to_store_in_warehouse'
  })
  canBeAbleToStoreInWarehouse: boolean;

  //Кол-во дней хранения на складе
  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'number_of_storage_days'
  })
  numberOfStorageDays: number;

  //Сайт поставщика
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'web_site'
  })
  webSite: string;

  //Ранжирование для сортировки
  @Column({
    type: 'int',
    nullable: true
  })
  rank: number;

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

  @OneToMany(() => ItemsSuppliers, itemsSuppliers => itemsSuppliers.supplier)
  itemsSuppliers: ItemsSuppliers[];

  @ManyToOne(() => Banks, bank => bank.suppliers)
  @JoinColumn({
    name: 'bank_id'
  })
  bank: Banks;
}
