import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PriceList } from '../../price-lists/entities/price-list.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('product_prices')
@Unique('UQ_product_price_list', ['product_id', 'price_list_id'])
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  product_id: number;

  @ManyToOne(() => Product, (product) => product.productPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int' })
  price_list_id: number;

  @ManyToOne(() => PriceList, (priceList) => priceList.productPrices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceList;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
