import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Banks } from './banks.entity';

@Entity({
  name: 'contaminants'
})
export class Contaminants {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    type: 'varchar',
    nullable: true
  })
  title: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  country: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  type: string;

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

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'acc_raschet'
  })
  accRaschet: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  inn: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  kpp: string;

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

  //Тип взаиморасчетов
  @Column({
    type: 'text',
    nullable: true,
    name: 'type_of_mutual_settlements'
  })
  typeOfMutualSettlements: string;

  @Column({
    type: 'int',
    nullable: true,
    name: 'bank_id'
  })
  bankId: number;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: new Date()
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: new Date()
  })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'deleted_at'
  })
  deletedAt: string;

  @ManyToOne(() => Banks, bank => bank.contaminants)
  @JoinColumn({
    name: 'bank_id'
  })
  bank: Banks;
}
