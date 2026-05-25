import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Product } from '../../catalog/products/entities/product.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Purchase } from './purchase.entity';

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organization_id!: string;

  @ManyToOne(
    () => Organization,
    (organization) => organization.inventory_movements,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  product_id!: string;

  @ManyToOne(() => Product, (product) => product.inventoryMovements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @ManyToOne(() => User, (user) => user.inventoryMovements, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'uuid', nullable: true })
  supplier_id!: string | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.inventory_movements, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier | null;

  @Column({ type: 'uuid', nullable: true })
  purchase_id!: string | null;

  @ManyToOne(() => Purchase, (purchase) => purchase.inventory_movements, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'purchase_id' })
  purchase!: Purchase | null;

  @Column({
    type: 'enum',
    enum: InventoryMovementType,
  })
  movement_type!: InventoryMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  previous_stock!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  new_stock!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
