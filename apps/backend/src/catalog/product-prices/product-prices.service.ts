import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { ProductPrice } from './entities/product-price.entity';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { PriceList } from '../price-lists/entities/price-list.entity';

@Injectable()
export class ProductPricesService {
  constructor(
    @InjectRepository(ProductPrice)
    private readonly productPricesRepository: Repository<ProductPrice>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PriceList)
    private readonly priceListsRepository: Repository<PriceList>,
  ) {}

  async create(createProductPriceDto: CreateProductPriceDto) {
    const [product, priceList] = await Promise.all([
      this.findProductOrFail(createProductPriceDto.product_id),
      this.findPriceListOrFail(createProductPriceDto.price_list_id),
    ]);

    const productPrice = this.productPricesRepository.create({
      ...createProductPriceDto,
      product,
      priceList,
    });

    return this.productPricesRepository.save(productPrice);
  }

  findAll() {
    return this.productPricesRepository.find({
      relations: { product: true, priceList: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const productPrice = await this.productPricesRepository.findOne({
      where: { id },
      relations: { product: true, priceList: true },
    });

    if (!productPrice) {
      throw new NotFoundException(`Product price with id ${id} not found`);
    }

    return productPrice;
  }

  async update(id: number, updateProductPriceDto: UpdateProductPriceDto) {
    const productPrice = await this.findOne(id);
    const product =
      updateProductPriceDto.product_id !== undefined
        ? await this.findProductOrFail(updateProductPriceDto.product_id)
        : productPrice.product;
    const priceList =
      updateProductPriceDto.price_list_id !== undefined
        ? await this.findPriceListOrFail(updateProductPriceDto.price_list_id)
        : productPrice.priceList;

    this.productPricesRepository.merge(productPrice, {
      ...updateProductPriceDto,
      product,
      priceList,
    });

    return this.productPricesRepository.save(productPrice);
  }

  async remove(id: number) {
    const productPrice = await this.findOne(id);
    await this.productPricesRepository.remove(productPrice);
    return { id, deleted: true };
  }

  private async findProductOrFail(id: number) {
    const product = await this.productsRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  private async findPriceListOrFail(id: number) {
    const priceList = await this.priceListsRepository.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list with id ${id} not found`);
    }

    return priceList;
  }
}
