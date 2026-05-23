import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { PriceList } from '../../catalog/price-lists/entities/price-list.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('clients')
export class Client {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  folio: string;

  @Column({ type: 'varchar', length: 30 })
  phone_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'uuid', nullable: true })
  price_list_id: string | null;

  @ManyToOne(() => PriceList, (priceList) => priceList.clients, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceList | null;

  @OneToMany(() => Order, (order) => order.client)
  orders: Order[];
}
