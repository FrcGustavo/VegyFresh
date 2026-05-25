import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { resolveBcryptSaltRounds } from '../auth/auth-security.config';

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
  private readonly bcryptSaltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds = resolveBcryptSaltRounds(this.configService);
  }

  async create(
    createUserDto: CreateUserDto,
    organizationId: string,
    creatorRole: string,
  ) {
    if (
      typeof createUserDto.password !== 'string' ||
      createUserDto.password.trim().length === 0
    ) {
      throw new BadRequestException('password is required');
    }

    const role = await this.findRoleOrFail(createUserDto.role_id);
    if (
      role.name.trim().toLowerCase() === 'admin' &&
      creatorRole.trim().toLowerCase() !== 'owner'
    ) {
      throw new ForbiddenException(
        'Only organization owners can assign admin role',
      );
    }

    return this.usersRepository.manager.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const userFolio = await this.buildUserFolio(manager);
      const passwordHash = await bcrypt.hash(
        createUserDto.password,
        this.bcryptSaltRounds,
      );
      const user = usersRepository.create({
        name: createUserDto.name,
        email: createUserDto.email,
        password_hash: passwordHash,
        folio: userFolio,
        avatar_url: createUserDto.avatar_url ?? null,
        organization_id: organizationId,
        role_id: role.id,
        role,
      });

      return usersRepository.save(user);
    });
  }

  async findAll(filters: FindAllUsersFilters = {}, organizationId: string) {
    const orderBy = this.normalizeOrderBy(filters.orderBy);
    const order = filters.order ?? 'ASC';
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim();
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy(`user.${orderBy}`, order)
      .take(limit)
      .skip(offset);

    qb.andWhere('user.organization_id = :organizationId', { organizationId });

    if (search) {
      qb.andWhere('user.name ILIKE :search', { search: `%${search}%` });
    }

    return qb.getMany();
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.usersRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    organizationId: string,
  ) {
    const user = await this.findOne(id, organizationId);
    const role =
      updateUserDto.role_id !== undefined
        ? await this.findRoleOrFail(updateUserDto.role_id)
        : user.role;
    const { password, ...userData } = updateUserDto;

    this.usersRepository.merge(user, {
      ...userData,
      ...(password
        ? { password_hash: await bcrypt.hash(password, this.bcryptSaltRounds) }
        : undefined),
      role,
    });

    return this.usersRepository.save(user);
  }

  async remove(id: string, organizationId: string) {
    const user = await this.usersRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException(
        `User with id ${id} was not found in organization ${organizationId}`,
      );
    }

    if (user.role?.name?.trim().toLowerCase() === 'owner') {
      const activeOwners = await this.usersRepository
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('user.organization_id = :organizationId', { organizationId })
        .andWhere('LOWER(role.name) = :roleName', { roleName: 'owner' })
        .getCount();

      if (activeOwners <= 1) {
        throw new BadRequestException(
          'Cannot remove the last active owner from organization',
        );
      }
    }

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
