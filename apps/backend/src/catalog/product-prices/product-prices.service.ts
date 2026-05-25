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

  async create(
    createProductPriceDto: CreateProductPriceDto,
    organizationId: string,
  ) {
    const [product, priceList] = await Promise.all([
      this.findProductOrFail(createProductPriceDto.product_id, organizationId),
      this.findPriceListOrFail(
        createProductPriceDto.price_list_id,
        organizationId,
      ),
    ]);

    const productPrice = this.productPricesRepository.create({
      ...createProductPriceDto,
      product,
      priceList,
      organization_id: organizationId,
    });

    return this.productPricesRepository.save(productPrice);
  }

  findAll(organizationId: string) {
    return this.productPricesRepository.find({
      where: { organization_id: organizationId },
      relations: { product: true, priceList: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const productPrice = await this.productPricesRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: { product: true, priceList: true },
    });

    if (!productPrice) {
      throw new NotFoundException(`Product price with id ${id} not found`);
    }

    return productPrice;
  }

  async update(
    id: string,
    updateProductPriceDto: UpdateProductPriceDto,
    organizationId: string,
  ) {
    const safeUpdateProductPriceDto = {
      ...updateProductPriceDto,
    } as UpdateProductPriceDto & {
      organization_id?: string;
    };
    delete safeUpdateProductPriceDto.organization_id;
    const productPrice = await this.findOne(id, organizationId);
    const product =
      safeUpdateProductPriceDto.product_id !== undefined
        ? await this.findProductOrFail(
            safeUpdateProductPriceDto.product_id,
            organizationId,
          )
        : productPrice.product;
    const priceList =
      safeUpdateProductPriceDto.price_list_id !== undefined
        ? await this.findPriceListOrFail(
            safeUpdateProductPriceDto.price_list_id,
            organizationId,
          )
        : productPrice.priceList;

    this.productPricesRepository.merge(productPrice, {
      ...safeUpdateProductPriceDto,
      product,
      priceList,
      organization_id: organizationId,
    });

    return this.productPricesRepository.save(productPrice);
  }

  async remove(id: string, organizationId: string) {
    const productPrice = await this.findOne(id, organizationId);
    await this.productPricesRepository.remove(productPrice);
    return { id, deleted: true };
  }

  private async findProductOrFail(id: string, organizationId: string) {
    const product = await this.productsRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  private async findPriceListOrFail(id: string, organizationId: string) {
    const priceList = await this.priceListsRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!priceList) {
      throw new NotFoundException(`Price list with id ${id} not found`);
    }

    return priceList;
  }
}
