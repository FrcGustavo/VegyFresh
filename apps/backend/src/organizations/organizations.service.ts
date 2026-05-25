import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import {
  OrganizationUser,
  OrganizationUserRole,
} from './entities/organization-user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const organizationsRepository = manager.getRepository(Organization);
      const organizationUsersRepository =
        manager.getRepository(OrganizationUser);

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

      // Create organization membership for the creator
      const membership = organizationUsersRepository.create({
        organization_id: savedOrganization.id,
        user_id: userId,
        role: OrganizationUserRole.OWNER,
        is_active: true,
      });
      await organizationUsersRepository.save(membership);

      return savedOrganization;
    });
  }

  async findAll(userId: string) {
    const memberships = await this.organizationUsersRepository.find({
      where: {
        user_id: userId,
        is_active: true,
      },
      relations: { organization: true },
      order: { created_at: 'DESC' },
    });

    return memberships.map((membership) => membership.organization);
  }

  async findOne(id: string, userId: string) {
    await this.findMembershipOrFail(userId, id);

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
    userId: string,
  ) {
    const organization = await this.findOne(id, userId);
    this.organizationsRepository.merge(organization, updateOrganizationDto);
    return this.organizationsRepository.save(organization);
  }

  async remove(id: string, userId: string) {
    const organization = await this.findOne(id, userId);
    await this.organizationsRepository.remove(organization);
    return { id, deleted: true };
  }

  async findMembershipOrFail(userId: string, organizationId: string) {
    const membership = await this.organizationUsersRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        is_active: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership for user ${userId} and organization ${organizationId} not found`,
      );
    }

    return membership;
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
