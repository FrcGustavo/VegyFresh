import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../../clients/entities/client.entity';
import { ProductPrice } from '../../product-prices/entities/product-price.entity';

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @OneToMany(() => Client, (client) => client.priceList)
  clients!: Client[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.priceList)
  productPrices!: ProductPrice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
