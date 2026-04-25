import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm';
import { PriceList } from '../catalog/price-lists/entities/price-list.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(PriceList)
    private readonly priceListsRepository: Repository<PriceList>,
  ) {}

  async create(createClientDto: CreateClientDto) {
    const priceList = await this.resolvePriceList(
      createClientDto.price_list_id,
    );
    const client = this.clientsRepository.create({
      ...createClientDto,
      email: createClientDto.email ?? null,
      address: createClientDto.address ?? null,
      avatar_url: createClientDto.avatar_url ?? null,
      price_list_id: priceList?.id ?? null,
      priceList,
    });

    return this.clientsRepository.save(client);
  }

  findAll() {
    return this.clientsRepository.find({
      relations: { priceList: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const client = await this.clientsRepository.findOne({
      where: { id },
      relations: { priceList: true },
    });

    if (!client) {
      throw new NotFoundException(`Client with id ${id} not found`);
    }

    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const client = await this.findOne(id);
    const priceList =
      updateClientDto.price_list_id === undefined
        ? client.priceList
        : await this.resolvePriceList(updateClientDto.price_list_id);

    this.clientsRepository.merge(client, {
      ...updateClientDto,
      price_list_id:
        updateClientDto.price_list_id === undefined
          ? client.price_list_id
          : (priceList?.id ?? null),
      priceList,
    });

    return this.clientsRepository.save(client);
  }

  async remove(id: number) {
    const client = await this.findOne(id);
    await this.clientsRepository.remove(client);
    return { id, deleted: true };
  }

  private async resolvePriceList(id?: number | null) {
    if (id === undefined || id === null) {
      return null;
    }

    const priceList = await this.priceListsRepository.findOneBy({ id });
    if (!priceList) {
      throw new NotFoundException(`Price list with id ${id} not found`);
    }

    return priceList;
  }
}
