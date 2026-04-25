import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

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
    const product = this.productsRepository.create({
      ...createProductDto,
      description: createProductDto.description ?? null,
      stock: createProductDto.stock ?? 0,
      images: createProductDto.images ?? [],
      supplier,
    });

    return this.productsRepository.save(product);
  }

  findAll() {
    return this.productsRepository.find({
      relations: { supplier: true, productPrices: true },
      order: { id: 'ASC' },
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
}
