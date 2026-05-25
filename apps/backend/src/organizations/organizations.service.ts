import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const organizationsRepository = manager.getRepository(Organization);
      const usersRepository = manager.getRepository(User);

      const folio = await this.buildOrganizationFolio(manager);
      const organization = organizationsRepository.create({
        ...createOrganizationDto,
        folio,
        logo_url: createOrganizationDto.logo_url ?? null,
        legal_name: createOrganizationDto.legal_name ?? null,
        email: createOrganizationDto.email ?? null,
        phone_number: createOrganizationDto.phone_number ?? null,
        address: createOrganizationDto.address ?? null,
      });

      const savedOrganization =
        await organizationsRepository.save(organization);

      const user = await usersRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      await usersRepository.update(
        { id: userId },
        {
          organization_id: savedOrganization.id,
        },
      );

      return savedOrganization;
    });
  }

  async findAll(organizationId: string) {
    return this.organizationsRepository.find({
      where: {
        id: organizationId,
      },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(
    id: string,
    currentOrganizationId: string,
    requiredRoles?: string[],
    currentRole?: string,
  ) {
    this.assertOrganizationAccess(
      id,
      currentOrganizationId,
      requiredRoles,
      currentRole,
    );

    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    currentOrganizationId: string,
    currentRole: string,
  ) {
    const organization = await this.findOne(
      id,
      currentOrganizationId,
      ['owner', 'admin'],
      currentRole,
    );
    this.organizationsRepository.merge(organization, updateOrganizationDto);
    return this.organizationsRepository.save(organization);
  }

  async remove(id: string, currentOrganizationId: string, currentRole: string) {
    const organization = await this.findOne(
      id,
      currentOrganizationId,
      ['owner'],
      currentRole,
    );
    await this.organizationsRepository.remove(organization);
    return { id, deleted: true };
  }

  private assertOrganizationAccess(
    requestedOrganizationId: string,
    currentOrganizationId: string,
    requiredRoles?: string[],
    currentRole?: string,
  ) {
    if (requestedOrganizationId !== currentOrganizationId) {
      throw new ForbiddenException(
        `User does not have access to organization ${requestedOrganizationId}`,
      );
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return;
    }

    if (!currentRole || !requiredRoles.includes(currentRole.toLowerCase())) {
      throw new ForbiddenException(
        `User does not have the required role in organization ${requestedOrganizationId}`,
      );
    }
  }

  private async buildOrganizationFolio(manager: EntityManager) {
    const queryResult: unknown = await manager.query(
      `SELECT nextval('organizations_folio_seq') AS folio`,
    );
    const rows = Array.isArray(queryResult) ? queryResult : [];
    const folioNumber = this.extractFolioNumber(rows[0]);
    return `O${String(folioNumber).padStart(5, '0')}`;
  }

  private extractFolioNumber(row: unknown): number {
    if (!row || typeof row !== 'object') {
      return 0;
    }

    const folio = (row as { folio?: unknown }).folio;
    if (typeof folio !== 'string' && typeof folio !== 'number') {
      return 0;
    }

    const parsed = Number(folio);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
