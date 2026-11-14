import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Brackets, Repository } from 'typeorm';
import { PriceList } from '../catalog/price-lists/entities/price-list.entity';
import { FoliosService } from '../folios/folios.service';

type ClientOrderField =
  | 'id'
  | 'folio'
  | 'name'
  | 'phone_number'
  | 'email'
  | 'price_list_id';

type FindAllClientsFilters = {
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(PriceList)
    private readonly priceListsRepository: Repository<PriceList>,
    private readonly foliosService: FoliosService,
  ) {}

  async create(createClientDto: CreateClientDto, organizationId: string) {
    const priceList = await this.getPriceList(
      organizationId,
      createClientDto.price_list_id,
    );

    const clientFolio = await this.foliosService.generateFolio(
      'clients',
      organizationId,
    );

    const client = this.clientsRepository.create({
      ...createClientDto,
      folio: clientFolio,
      email: createClientDto.email ?? null,
      country: createClientDto.country ?? null,
      state: createClientDto.state ?? null,
      city: createClientDto.city ?? null,
      postal_code: createClientDto.postal_code ?? null,
      address: createClientDto.address ?? null,
      suburb: createClientDto.suburb ?? null,
      external_number: createClientDto.external_number ?? null,
      internal_number: createClientDto.internal_number ?? null,
      avatar_url: createClientDto.avatar_url ?? null,
      price_list_id: priceList?.id ?? null,
      priceList,
      organization_id: organizationId,
    });

    return this.clientsRepository.save(client);
  }

  findAll(filters: FindAllClientsFilters = {}, organizationId: string) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    const qb = this.clientsRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.priceList', 'priceList')
      .where('client.organization_id = :organizationId', { organizationId })
      .orderBy(`client.${orderBy}`, order)
      .take(limit)
      .skip(offset);

    if (search) {
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb
            .where('client.name ILIKE :search', { search: `%${search}%` })
            .orWhere('client.folio ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    return qb.getMany();
  }

  async findOne(id: string, organizationId: string) {
    const client = await this.clientsRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: { priceList: true },
    });

    if (!client) {
      throw new NotFoundException(`Client with id ${id} not found`);
    }

    return client;
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    organizationId: string,
  ) {
    const client = await this.findOne(id, organizationId);
    const priceList =
      updateClientDto.price_list_id === undefined
        ? client.priceList
        : await this.getPriceList(
            organizationId,
            updateClientDto.price_list_id,
          );

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

  async remove(id: string, organizationId: string) {
    const client = await this.findOne(id, organizationId);
    await this.clientsRepository.remove(client);
    return { id, deleted: true };
  }

  private normalizeOrderBy(orderBy?: string): ClientOrderField {
    if (!orderBy) {
      return 'id';
    }

    const allowedFields = new Set<ClientOrderField>([
      'id',
      'folio',
      'name',
      'phone_number',
      'email',
      'price_list_id',
    ]);

    return allowedFields.has(orderBy as ClientOrderField)
      ? (orderBy as ClientOrderField)
      : 'id';
  }

  private async getPriceList(
    organizationId?: string,
    priceListId?: string | null,
  ) {
    if (!priceListId) {
      throw new BadRequestException('Price list is required');
    }

    const priceList = await this.priceListsRepository.findOneBy({
      id: priceListId,
      organization_id: organizationId,
    });

    if (!priceList) {
      throw new NotFoundException(
        `Price list with id ${priceListId} not found`,
      );
    }

    return priceList;
  }

  findByPhone(phoneNumber: string, organizationId: string) {
    // Normalize: strip non-digits and leading zeros for comparison
    const normalized = phoneNumber.replace(/\D/g, '');
    const query = this.clientsRepository
      .createQueryBuilder('client')
      .where(
        "REGEXP_REPLACE(client.phone_number, '[^0-9]', '', 'g') LIKE :phone",
        {
          phone: `%${normalized}`,
        },
      );

    query.andWhere('client.organization_id = :organizationId', {
      organizationId,
    });

    return query.getOne();
  }
}
