import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const role = await this.findRoleOrFail(createUserDto.role_id);
    const user = this.usersRepository.create({
      ...createUserDto,
      avatar_url: createUserDto.avatar_url ?? null,
      role,
    });

    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find({
      relations: { role: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    const role =
      updateUserDto.role_id !== undefined
        ? await this.findRoleOrFail(updateUserDto.role_id)
        : user.role;

    this.usersRepository.merge(user, {
      ...updateUserDto,
      role,
    });

    return this.usersRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);

    return { id, deleted: true };
  }

  private async findRoleOrFail(id: number) {
    const role = await this.rolesRepository.findOneBy({ id });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }
}
