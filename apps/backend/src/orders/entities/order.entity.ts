import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum OrderStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELIVERED = 'DELIVERED',
}

export enum OrderOrigin {
  WHATSAPP = 'WHATSAPP',
  MANUAL = 'MANUAL',
}

@Entity('orders')
@Unique('UQ_orders_org_id', ['organization_id', 'id'])
@Unique('UQ_orders_org_folio', ['organization_id', 'folio'])
export class Order {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  client_id!: string;

  @ManyToOne(() => Client, (client) => client.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid' })
  organization_id!: string;

  @ManyToOne(() => Organization, (organization) => organization.orders, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount!: number;

  @Column({ type: 'varchar', length: 40 })
  folio!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_REVIEW,
  })
  status!: OrderStatus;

  @Column({
    type: 'enum',
    enum: OrderOrigin,
  })
  origin!: OrderOrigin;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items!: OrderItem[];

  @Column({ name: 'delivery_date', type: 'timestamp', nullable: true })
  delivery_date!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
