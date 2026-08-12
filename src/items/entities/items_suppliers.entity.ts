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

  //Минимальный заказ у поставщика
  @Column({
    type: 'int',
    name: 'supplier_minimum_order',
    nullable: true
  })
  supplierMinimumOrder: number;

  //Номер короба
  @Column({ type: 'varchar', nullable: true, name: 'box_number' })
  boxNumber: string;

  //Себестоимость в юанях
  @Column({ type: 'float', name: 'cost_in_yuan', nullable: true })
  costInYuan: number;

  //Себестоимость в юанях белая
  @Column({ type: 'float', name: 'cost_in_yuan_white', nullable: true })
  costInYuanWhite: number;

  //Кратность товара
  @Column({ type: 'varchar', nullable: true })
  multiplicity: string;

  //Сборка груза
  @Column({ type: 'int', nullable: true })
  assembling: number;

  //Производство товара
  @Column({ type: 'int', nullable: true })
  production: number;

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
