import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Contaminants } from './contaminants.entity';
import { Suppliers } from './suppliers.entity';

@Entity({
  name: 'banks'
})
export class Banks {
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
    nullable: true,
    name: 'acc_bik'
  })
  accBik: string;

  @Column({
    type: 'varchar',
    name: 'acc_korschet',
    nullable: true
  })
  accKorschet: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  address: string;

  @Column({
    type: 'varchar',
    nullable: true
  })
  swift: string;

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

  @OneToMany(() => Contaminants, contaminants => contaminants.bank)
  contaminants: Contaminants;

  @OneToMany(() => Suppliers, supplier => supplier.bank)
  suppliers: Suppliers[];
}
