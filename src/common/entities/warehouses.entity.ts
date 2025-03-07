import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({
  name: 'warehouses'
})
export class Warehouses {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'createdAt',
    default: new Date(),
    select: false
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: false,
    name: 'updatedAt',
    default: new Date(),
    select: false
  })
  updatedAt: Date;
}
