import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

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
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  client_id!: number;

  @ManyToOne(() => Client, (client) => client.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ type: 'int' })
  user_id!: number;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount!: number;

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

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
