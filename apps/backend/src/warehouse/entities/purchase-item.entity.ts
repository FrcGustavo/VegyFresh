import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Purchase } from './purchase.entity';
import { Product } from '../../catalog/products/entities/product.entity';

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  purchase_id!: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase;

  @Column({ type: 'uuid' })
  product_id!: string;

  @ManyToOne(() => Product, (product) => product.purchaseItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_cost!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;
}
