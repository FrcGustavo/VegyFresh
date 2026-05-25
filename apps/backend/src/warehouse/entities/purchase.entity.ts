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
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { PurchaseItem } from './purchase-item.entity';
import { InventoryMovement } from './inventory-movement.entity';

@Entity('purchases')
@Unique('UQ_purchases_org_folio', ['organization_id', 'folio'])
export class Purchase {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organization_id!: string;

  @ManyToOne(() => Organization, (organization) => organization.purchases, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  supplier_id!: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchases, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, (user) => user.purchases, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 40 })
  folio!: string;

  @Column({ type: 'timestamp' })
  purchase_date!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => PurchaseItem, (item) => item.purchase)
  items!: PurchaseItem[];

  @OneToMany(() => InventoryMovement, (movement) => movement.purchase)
  inventory_movements!: InventoryMovement[];

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
