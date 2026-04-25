import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceList } from './entities/price-list.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PriceListsService {
  constructor(
    @InjectRepository(PriceList)
    private readonly priceListsRepository: Repository<PriceList>,
  ) {}

  create(createPriceListDto: CreatePriceListDto) {
    const priceList = this.priceListsRepository.create(createPriceListDto);
    return this.priceListsRepository.save(priceList);
  }

  findAll() {
    return this.priceListsRepository.find({
      relations: { clients: true, productPrices: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: string) {
    const priceList = await this.priceListsRepository.findOne({
      where: { id },
      relations: {
        clients: true,
        productPrices: { product: true },
      },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with id ${id} not found`);
    }

    return priceList;
  }

  async update(id: string, updatePriceListDto: UpdatePriceListDto) {
    const priceList = await this.findOne(id);
    this.priceListsRepository.merge(priceList, updatePriceListDto);
    return this.priceListsRepository.save(priceList);
  }

  async remove(id: string) {
    const priceList = await this.findOne(id);
    await this.priceListsRepository.remove(priceList);
    return { id, deleted: true };
  }
}
