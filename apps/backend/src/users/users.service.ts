import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ILike, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';

type UserOrderField = 'id' | 'folio' | 'name' | 'email' | 'created_at';

type FindAllUsersFilters = {
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
};

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
    const userFolio = await this.buildUserFolio(this.usersRepository.manager);
    const user = this.usersRepository.create({
      ...createUserDto,
      folio: userFolio,
      avatar_url: createUserDto.avatar_url ?? null,
      role,
    });

    return this.usersRepository.save(user);
  }

  findAll(filters: FindAllUsersFilters = {}) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();

    return this.usersRepository.find({
      where: search ? { name: ILike(`%${search}%`) } : undefined,
      relations: { role: true },
      order: { [orderBy]: order },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
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

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);

    return { id, deleted: true };
  }

  private async findRoleOrFail(id: string) {
    const role = await this.rolesRepository.findOneBy({ id });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  private normalizeOrderBy(orderBy?: string): UserOrderField {
    if (!orderBy) {
      return 'id';
    }

    const allowedFields = new Set<UserOrderField>([
      'id',
      'folio',
      'name',
      'email',
      'created_at',
    ]);

    return allowedFields.has(orderBy as UserOrderField)
      ? (orderBy as UserOrderField)
      : 'id';
  }

  private async buildUserFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('users_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `U${String(folioNumber).padStart(5, '0')}`;
  }
}
