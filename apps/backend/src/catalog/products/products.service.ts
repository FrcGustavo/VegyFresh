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

  async create(createProductDto: CreateProductDto) {
    const supplier = await this.findSupplierOrFail(
      createProductDto.supplier_id,
    );
    const productFolio = await this.buildProductFolio(this.productsRepository.manager);
    const product = this.productsRepository.create({
      ...createProductDto,
      folio: productFolio,
      description: createProductDto.description ?? null,
      stock: createProductDto.stock ?? 0,
      unit: createProductDto.unit ?? ProductUnit.PZ,
      images: createProductDto.images ?? [],
      supplier,
    });

    return this.productsRepository.save(product);
  }

  findAll(filters: FindAllProductsFilters = {}) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    return this.productsRepository.find({
      where: search
        ? [{ name: ILike(`%${search}%`) }, { folio: ILike(`%${search}%`) }]
        : undefined,
      relations: { supplier: true, productPrices: true },
      order: { [orderBy]: order },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({
      where: { id },
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

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    const supplier =
      updateProductDto.supplier_id !== undefined
        ? await this.findSupplierOrFail(updateProductDto.supplier_id)
        : product.supplier;

    this.productsRepository.merge(product, {
      ...updateProductDto,
      supplier,
    });

    return this.productsRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
    return { id, deleted: true };
  }

  private async findSupplierOrFail(id: string) {
    const supplier = await this.suppliersRepository.findOneBy({ id });

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
