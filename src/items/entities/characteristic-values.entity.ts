import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Characteristics } from './characteristics.entity';

@Entity({
  name: 'characteristic_values'
})
export class CharacteristicValues {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'characteristic_id', nullable: false })
  characteristicId: number;

  @Column({ type: 'varchar', nullable: false })
  value: string;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'created_at',
    default: () => 'now()'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
    name: 'updated_at',
    default: () => 'now()'
  })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'deleted_at'
  })
  deletedAt: Date | null;

  @ManyToOne(() => Characteristics, characteristic => characteristic.characteristicValues, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'characteristic_id' })
  characteristic: Characteristics;
}
