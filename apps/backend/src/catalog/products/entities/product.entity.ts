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
import { OrderItem } from '../../../orders/entities/order-item.entity';
import { ProductPrice } from '../../product-prices/entities/product-price.entity';
import { Supplier } from '../../../suppliers/entities/supplier.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

export enum ProductUnit {
  KG = 'kg',
  PZ = 'pz',
}

@Entity('products')
@Unique('UQ_products_org_folio', ['organization_id', 'folio'])
@Unique('UQ_products_org_sku', ['organization_id', 'sku'])
export class Product {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'varchar', length: 40 })
  folio!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid' })
  supplier_id!: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @Column({ type: 'uuid' })
  organization_id!: string;

  @ManyToOne(() => Organization, (organization) => organization.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({
    type: 'enum',
    enum: ProductUnit,
    default: ProductUnit.PZ,
  })
  unit!: ProductUnit;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  images!: string[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems!: OrderItem[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.product)
  productPrices!: ProductPrice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
