import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'orders'
})
export class Orders {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  sum: number;
}
