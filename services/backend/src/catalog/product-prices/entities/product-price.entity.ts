import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PriceList } from '../../price-lists/entities/price-list.entity';
import { Product } from '../../products/entities/product.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('product_prices')
@Unique('UQ_product_price_list_org', [
  'organization_id',
  'product_id',
  'price_list_id',
])
export class ProductPrice {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.productPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  price_list_id: string;

  @ManyToOne(() => PriceList, (priceList) => priceList.productPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceList;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (organization) => organization.productPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
