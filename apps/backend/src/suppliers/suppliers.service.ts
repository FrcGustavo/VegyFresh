import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { ILike, Repository } from 'typeorm';

type SupplierOrderField =
  | 'id'
  | 'folio'
  | 'name'
  | 'createdAt'
  | 'updatedAt';

type FindAllSuppliersFilters = {
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
};

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    const supplierFolio = await this.buildSupplierFolio(
      this.suppliersRepository.manager,
    );
    const supplier = this.suppliersRepository.create({
      ...createSupplierDto,
      folio: supplierFolio,
      contact_info: createSupplierDto.contact_info ?? null,
      logo_url: createSupplierDto.logo_url ?? null,
    });

    return this.suppliersRepository.save(supplier);
  }

  findAll(filters: FindAllSuppliersFilters = {}) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    return this.suppliersRepository.find({
      where: search ? { name: ILike(`%${search}%`) } : undefined,
      relations: { products: true },
      order: { [orderBy]: order },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
      relations: { products: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    this.suppliersRepository.merge(supplier, updateSupplierDto);
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.remove(supplier);
    return { id, deleted: true };
  }

  private normalizeOrderBy(orderBy?: string): SupplierOrderField {
    if (!orderBy) {
      return 'id';
    }

    const allowedFields = new Set<SupplierOrderField>([
      'id',
      'folio',
      'name',
      'createdAt',
      'updatedAt',
    ]);

    return allowedFields.has(orderBy as SupplierOrderField)
      ? (orderBy as SupplierOrderField)
      : 'id';
  }

  private async buildSupplierFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('suppliers_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `S${String(folioNumber).padStart(5, '0')}`;
  }
}
