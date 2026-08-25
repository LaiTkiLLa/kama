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
import { Items } from './items.entity';
import { Characteristics } from './characteristics.entity';
import { ItemsSuppliers } from './items_suppliers.entity';

@Entity({
  name: 'item_characteristics'
})
export class ItemCharacteristics {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'int', name: 'item_id', nullable: false })
  itemId: number;

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

  @ManyToOne(() => Items, item => item.itemCharacteristics, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'item_id' })
  item: Items;

  @ManyToOne(() => Characteristics, characteristic => characteristic.itemCharacteristics, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'characteristic_id' })
  characteristic: Characteristics;

  @OneToMany(() => ItemsSuppliers, itemsSupplier => itemsSupplier.itemCharacteristic)
  itemsSuppliers: ItemsSuppliers[];
}
