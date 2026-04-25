import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  create(createSupplierDto: CreateSupplierDto) {
    const supplier = this.suppliersRepository.create({
      ...createSupplierDto,
      contact_info: createSupplierDto.contact_info ?? null,
      logo_url: createSupplierDto.logo_url ?? null,
    });

    return this.suppliersRepository.save(supplier);
  }

  findAll() {
    return this.suppliersRepository.find({
      relations: { products: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
      relations: { products: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`);
    }

    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    this.suppliersRepository.merge(supplier, updateSupplierDto);
    return this.suppliersRepository.save(supplier);
  }

  async remove(id: number) {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.remove(supplier);
    return { id, deleted: true };
  }
}
