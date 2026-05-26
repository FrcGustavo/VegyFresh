import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceList } from './entities/price-list.entity';
import { ILike, Repository } from 'typeorm';

type PriceListOrderField = 'id' | 'folio' | 'name' | 'createdAt' | 'updatedAt';

type FindAllPriceListsFilters = {
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
};

@Injectable()
export class PriceListsService {
  constructor(
    @InjectRepository(PriceList)
    private readonly priceListsRepository: Repository<PriceList>,
  ) {}

  async create(createPriceListDto: CreatePriceListDto, organizationId: string) {
    const priceListFolio = await this.buildPriceListFolio(
      this.priceListsRepository.manager,
    );
    const priceList = this.priceListsRepository.create({
      ...createPriceListDto,
      folio: priceListFolio,
      organization_id: organizationId,
    });
    return this.priceListsRepository.save(priceList);
  }

  findAll(filters: FindAllPriceListsFilters = {}, organizationId: string) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    return this.priceListsRepository.find({
      where: search
        ? {
            name: ILike(`%${search}%`),
            organization_id: organizationId,
          }
        : { organization_id: organizationId },
      relations: { clients: true, productPrices: { product: true } },
      order: { [orderBy]: order },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string, organizationId: string) {
    const priceList = await this.priceListsRepository.findOne({
      where: { id, organization_id: organizationId },
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

  async update(
    id: string,
    updatePriceListDto: UpdatePriceListDto,
    organizationId: string,
  ) {
    const priceList = await this.findOne(id, organizationId);
    this.priceListsRepository.merge(priceList, updatePriceListDto);
    return this.priceListsRepository.save(priceList);
  }

  async remove(id: string, organizationId: string) {
    const priceList = await this.findOne(id, organizationId);
    await this.priceListsRepository.remove(priceList);
    return { id, deleted: true };
  }

  private normalizeOrderBy(orderBy?: string): PriceListOrderField {
    if (!orderBy) {
      return 'id';
    }

    const allowedFields = new Set<PriceListOrderField>([
      'id',
      'folio',
      'name',
      'createdAt',
      'updatedAt',
    ]);

    return allowedFields.has(orderBy as PriceListOrderField)
      ? (orderBy as PriceListOrderField)
      : 'id';
  }

  private async buildPriceListFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('price_lists_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `L${String(folioNumber).padStart(5, '0')}`;
  }
}
