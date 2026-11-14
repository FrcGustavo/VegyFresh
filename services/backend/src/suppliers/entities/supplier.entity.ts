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
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../catalog/products/entities/product.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { InventoryMovement } from '../../inventory/entities/inventory-movement.entity';

@Entity('suppliers')
@Unique('UQ_suppliers_org_folio', ['organization_id', 'folio'])
export class Supplier {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  folio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone_number: string | null;

  @Column({ type: 'text', nullable: true })
  logo_url: string | null;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (organization) => organization.suppliers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @OneToMany(() => Purchase, (purchase) => purchase.supplier)
  purchases: Purchase[];

  @OneToMany(
    () => InventoryMovement,
    (inventoryMovement) => inventoryMovement.supplier,
  )
  inventory_movements: InventoryMovement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
