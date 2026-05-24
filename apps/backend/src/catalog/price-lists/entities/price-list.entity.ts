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
import { Client } from '../../../clients/entities/client.entity';
import { ProductPrice } from '../../product-prices/entities/product-price.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('price_lists')
@Unique('UQ_price_lists_org_folio', ['organization_id', 'folio'])
@Unique('UQ_price_lists_org_name', ['organization_id', 'name'])
export class PriceList {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 40 })
  folio!: string;

  @Column({ type: 'uuid' })
  organization_id!: string;

  @ManyToOne(() => Organization, (organization) => organization.priceLists, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @OneToMany(() => Client, (client) => client.priceList)
  clients!: Client[];

  @OneToMany(() => ProductPrice, (productPrice) => productPrice.priceList)
  productPrices!: ProductPrice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
