import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { CharacteristicValues } from './characteristic-values.entity';
import { ItemCharacteristics } from './item-characteristics.entity';

@Entity({
  name: 'characteristics'
})
export class Characteristics {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  type: string;

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

  @OneToMany(() => CharacteristicValues, characteristicValue => characteristicValue.characteristic)
  characteristicValues: CharacteristicValues[];

  @OneToMany(() => ItemCharacteristics, itemCharacteristic => itemCharacteristic.characteristic)
  itemCharacteristics: ItemCharacteristics[];
}
