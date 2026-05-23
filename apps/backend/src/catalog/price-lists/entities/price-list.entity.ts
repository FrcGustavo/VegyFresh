import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../../clients/entities/client.entity';
import { ProductPrice } from '../../product-prices/entities/product-price.entity';

@Entity('price_lists')
export class PriceList {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  folio!: string;

  @OneToMany(() => Client, (client) => client.priceList)
  clients!: Client[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.priceList)
  productPrices!: ProductPrice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
