import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ItemsSuppliers } from '../../items/entities/items_suppliers.entity';

@Entity({
  name: 'suppliers'
})
export class Suppliers {
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
    nullable: true
  })
  contact: string;

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

  //Тип расчета в белую или серую
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'type_of_calculation'
  })
  typeOfCalculation: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'legal_title'
  })
  legalTitle: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'legal_address'
  })
  legalAddress: string;

  //Рейтинг надежности
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'reliability_rating'
  })
  reliabilityRating: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'warehouse_address'
  })
  warehouseAddress: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'responsible_employee'
  })
  responsibleEmployee: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  comment: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'credit_limit'
  })
  creditLimit: string;

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
}
