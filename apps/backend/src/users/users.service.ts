import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import {
  OrganizationUser,
  OrganizationUserRole,
} from '../organizations/entities/organization-user.entity';
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
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds = resolveBcryptSaltRounds(this.configService);
  }

  async create(createUserDto: CreateUserDto, organizationId: string) {
    const role = await this.findRoleOrFail(createUserDto.role_id);
    const userFolio = await this.buildUserFolio(this.usersRepository.manager);
    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      this.bcryptSaltRounds,
    );
    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password_hash: passwordHash,
      folio: userFolio,
      avatar_url: createUserDto.avatar_url ?? null,
      role,
    });

    const savedUser = await this.usersRepository.save(user);

    const existingMembership = await this.organizationUsersRepository.findOne({
      where: { user_id: savedUser.id, organization_id: organizationId },
    });
    if (!existingMembership) {
      const membership = this.organizationUsersRepository.create({
        user_id: savedUser.id,
        organization_id: organizationId,
        role: OrganizationUserRole.MEMBER,
        is_active: true,
      });
      await this.organizationUsersRepository.save(membership);
    }

    return savedUser;
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

    qb.innerJoin(
      OrganizationUser,
      'organizationUser',
      'organizationUser.user_id = user.id AND organizationUser.organization_id = :organizationId AND organizationUser.is_active = true',
      { organizationId },
    );

    if (search) {
      qb.andWhere('user.name ILIKE :search', { search: `%${search}%` });
    }

    return qb.getMany();
  }

  async findOne(id: string, organizationId: string) {
    await this.findMembershipOrFail(id, organizationId);

    const user = await this.usersRepository.findOne({
      where: { id },
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
    const user = await this.findOne(id, organizationId);
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

  private async findMembershipOrFail(userId: string, organizationId: string) {
    const membership = await this.organizationUsersRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        is_active: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `User with id ${userId} was not found in organization ${organizationId}`,
      );
    }
  }
}
