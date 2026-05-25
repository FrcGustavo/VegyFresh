import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Product } from '../../catalog/products/entities/product.entity';
import { PriceList } from '../../catalog/price-lists/entities/price-list.entity';
import { Order } from '../../orders/entities/order.entity';
import { ProductPrice } from '../../catalog/product-prices/entities/product-price.entity';
import { User } from '../../users/entities/user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  folio!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  logo_url!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legal_name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone_number!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => Client, (client) => client.organization)
  clients!: Client[];

  @OneToMany(() => Supplier, (supplier) => supplier.organization)
  suppliers!: Supplier[];

  @OneToMany(() => Product, (product) => product.organization)
  products!: Product[];

  @OneToMany(() => PriceList, (priceList) => priceList.organization)
  priceLists!: PriceList[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.organization)
  productPrices!: ProductPrice[];

  @OneToMany(() => Order, (order) => order.organization)
  orders!: Order[];

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
