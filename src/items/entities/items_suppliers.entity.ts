import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Items } from './items.entity';
import { Suppliers } from '../../info/entities/suppliers.entity';

@Index(['itemId', 'supplierId'], { unique: true })
@Entity({
  name: 'items_suppliers'
})
export class ItemsSuppliers {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({
    type: 'int',
    name: 'item_id',
    nullable: false
  })
  itemId: number;

  @Column({
    type: 'int',
    name: 'supplier_id',
    nullable: false
  })
  supplierId: number;

  @ManyToOne(() => Items, item => item.itemsSuppliers, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'item_id'
  })
  item: Items;

  @ManyToOne(() => Suppliers, supplier => supplier.itemsSuppliers, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({
    name: 'supplier_id'
  })
  supplier: Suppliers;
}
