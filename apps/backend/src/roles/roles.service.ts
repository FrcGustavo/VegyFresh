import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  create(createRoleDto: CreateRoleDto) {
    const role = this.rolesRepository.create({
      ...createRoleDto,
      permissions: createRoleDto.permissions ?? [],
    });

    return this.rolesRepository.save(role);
  }

  findAll() {
    return this.rolesRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const role = await this.rolesRepository.findOneBy({ id });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);
    this.rolesRepository.merge(role, updateRoleDto);
    return this.rolesRepository.save(role);
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
    return { id, deleted: true };
  }
}
