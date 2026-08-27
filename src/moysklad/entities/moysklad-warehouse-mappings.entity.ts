import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Warehouses } from '../../info/entities/warehouses.entity';

@Entity({
  name: 'moysklad_warehouse_mappings'
})
export class MoyskladWarehouseMappings {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'uuid', name: 'moysklad_store_id', nullable: false, unique: true })
  moyskladStoreId: string;

  @Column({ type: 'int', name: 'warehouse_id', nullable: false, unique: true })
  warehouseId: number;

  @Column({ type: 'uuid', name: 'moysklad_agent_id', nullable: true })
  moyskladAgentId: string | null;

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

  @ManyToOne(() => Warehouses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouses;
}
