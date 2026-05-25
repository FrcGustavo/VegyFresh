import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductUnit } from './entities/product.entity';
import { ILike, Repository } from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

type ProductOrderField =
  | 'id'
  | 'name'
  | 'folio'
  | 'unit'
  | 'sku'
  | 'stock'
  | 'createdAt'
  | 'updatedAt';

type FindAllProductsFilters = {
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async create(createProductDto: CreateProductDto, organizationId: string) {
    const supplier = await this.findSupplierOrFail(
      createProductDto.supplier_id,
      organizationId,
    );
    const productFolio = await this.buildProductFolio(
      this.productsRepository.manager,
    );
    const product = this.productsRepository.create({
      ...createProductDto,
      folio: productFolio,
      description: createProductDto.description ?? null,
      stock: createProductDto.stock ?? 0,
      unit: createProductDto.unit ?? ProductUnit.PZ,
      images: createProductDto.images ?? [],
      supplier,
      organization_id: organizationId,
    });

    return this.productsRepository.save(product);
  }

  findAll(filters: FindAllProductsFilters = {}, organizationId: string) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    return this.productsRepository.find({
      where: search
        ? [
            {
              name: ILike(`%${search}%`),
              organization_id: organizationId,
            },
            {
              folio: ILike(`%${search}%`),
              organization_id: organizationId,
            },
          ]
        : { organization_id: organizationId },
      relations: { supplier: true, productPrices: true },
      order: { [orderBy]: order },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.productsRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: {
        supplier: true,
        productPrices: { priceList: true },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    organizationId: string,
  ) {
    const safeUpdateProductDto = { ...updateProductDto } as UpdateProductDto & {
      organization_id?: string;
    };
    delete safeUpdateProductDto.organization_id;
    const product = await this.findOne(id, organizationId);
    const supplier =
      safeUpdateProductDto.supplier_id !== undefined
        ? await this.findSupplierOrFail(
            safeUpdateProductDto.supplier_id,
            organizationId,
          )
        : product.supplier;

    this.productsRepository.merge(product, {
      ...safeUpdateProductDto,
      supplier,
      organization_id: organizationId,
    });

    return this.productsRepository.save(product);
  }

  async remove(id: string, organizationId: string) {
    const product = await this.findOne(id, organizationId);
    await this.productsRepository.remove(product);
    return { id, deleted: true };
  }

  private async findSupplierOrFail(id: string, organizationId: string) {
    const supplier = await this.suppliersRepository.findOneBy({
      id,
      organization_id: organizationId,
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`);
    }

    return supplier;
  }

  private async buildProductFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('products_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `P${String(folioNumber).padStart(5, '0')}`;
  }

  private normalizeOrderBy(orderBy?: string): ProductOrderField {
    if (!orderBy) {
      return 'id';
    }

    const allowedFields = new Set<ProductOrderField>([
      'id',
      'name',
      'folio',
      'unit',
      'sku',
      'stock',
      'createdAt',
      'updatedAt',
    ]);

    return allowedFields.has(orderBy as ProductOrderField)
      ? (orderBy as ProductOrderField)
      : 'id';
  }
}
