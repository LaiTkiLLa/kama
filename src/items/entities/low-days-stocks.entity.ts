import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({
  name: 'low_days_stocks'
})
export class LowDaysStocks {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    type: 'varchar',
    nullable: false
  })
  article: string;

  @Column({
    name: 'days_stock_fullfillment',
    type: 'float',
    nullable: true
  })
  daysStockFullfillment: number;

  @Column({
    name: 'days_stock_country',
    type: 'float',
    nullable: true
  })
  daysStockCountry: number;

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
}
