import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { FoliosService } from '../folios/folios.service';

const DEFAULT_ORGANIZATION_FOLIO_PREFIXES = {
  product_folio_prefix: 'P',
  price_list_folio_prefix: 'LP',
  order_folio_prefix: 'P',
  client_folio_prefix: 'C',
  supplier_folio_prefix: 'P',
  purchase_folio_prefix: 'C',
  user_folio_prefix: 'U',
} as const;

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    private readonly foliosService: FoliosService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const organizationsRepository = manager.getRepository(Organization);
      const usersRepository = manager.getRepository(User);
      const user = await usersRepository.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      if (user.organization_id) {
        throw new ForbiddenException(
          'User already belongs to an organization and cannot create a new one',
        );
      }

      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        'organizations:folio',
      ]);
      const folio = await this.foliosService.generateFolio('organizations');
      const organization = organizationsRepository.create({
        folio,
        name: createOrganizationDto.name,
        logo_url: createOrganizationDto.logo_url ?? null,
        legal_name: createOrganizationDto.legal_name ?? null,
        email: createOrganizationDto.email ?? null,
        phone_number: createOrganizationDto.phone_number ?? null,
        address: createOrganizationDto.address ?? null,
        product_folio_prefix:
          createOrganizationDto.product_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.product_folio_prefix,
        price_list_folio_prefix:
          createOrganizationDto.price_list_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.price_list_folio_prefix,
        order_folio_prefix:
          createOrganizationDto.order_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.order_folio_prefix,
        client_folio_prefix:
          createOrganizationDto.client_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.client_folio_prefix,
        supplier_folio_prefix:
          createOrganizationDto.supplier_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.supplier_folio_prefix,
        purchase_folio_prefix:
          createOrganizationDto.purchase_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.purchase_folio_prefix,
        user_folio_prefix:
          createOrganizationDto.user_folio_prefix ??
          DEFAULT_ORGANIZATION_FOLIO_PREFIXES.user_folio_prefix,
      });

      const savedOrganization =
        await organizationsRepository.save(organization);

      await usersRepository.update(
        { id: userId },
        {
          organization_id: savedOrganization.id,
        },
      );

      return savedOrganization;
    });
  }

  async findOne(id: string, userId: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id, users: { id: userId } },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    return organization;
  }

  async update(
    id: string,
    userId: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ) {
    const organization = await this.findOne(id, userId);
    this.organizationsRepository.merge(organization, updateOrganizationDto);

    return this.organizationsRepository.save(organization);
  }
}
