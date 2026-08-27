import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm';
import { OrdersV2 } from '../../orders/entities/orders_v2.entity';
import { MoyskladOutboxStatus } from '../moysklad-outbox-status.enum';
import { MoyskladOutboxType } from '../moysklad-outbox-type.enum';

@Entity({
  name: 'moysklad_outbox'
})
@Unique('UQ_moysklad_outbox_type_orders_v2_id', ['type', 'ordersV2Id'])
@Index('IDX_moysklad_outbox_status_id', ['status', 'id'])
export class MoyskladOutbox {
  @PrimaryGeneratedColumn('identity', {
    generatedIdentity: 'ALWAYS'
  })
  id: number;

  @Column({ type: 'varchar', nullable: false })
  type: MoyskladOutboxType;

  @Column({ type: 'int', name: 'orders_v2_id', nullable: false })
  ordersV2Id: number;

  /** pending = не отправлено, done = отправлено */
  @Column({ type: 'varchar', nullable: false })
  status: MoyskladOutboxStatus;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'uuid', name: 'moysklad_entity_id', nullable: true })
  moyskladEntityId: string | null;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  payload: Record<string, unknown>;

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

  @ManyToOne(() => OrdersV2, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orders_v2_id' })
  order: OrdersV2;
}
