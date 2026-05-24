import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationUser } from './entities/organization-user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, userId: string) {
    const folio = await this.buildOrganizationFolio();
    const organization = this.organizationsRepository.create({
      ...createOrganizationDto,
      folio,
      legal_name: createOrganizationDto.legal_name ?? null,
      email: createOrganizationDto.email ?? null,
      phone_number: createOrganizationDto.phone_number ?? null,
      address: createOrganizationDto.address ?? null,
    });

    const savedOrganization = await this.organizationsRepository.save(organization);

    // Create organization membership for the creator
    const membership = this.organizationUsersRepository.create({
      organization_id: savedOrganization.id,
      user_id: userId,
      role: 'owner' as any,
      is_active: true,
    });
    await this.organizationUsersRepository.save(membership);

    return savedOrganization;
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

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto, userId: string) {
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
      relations: { organization: true, user: true },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membership for user ${userId} and organization ${organizationId} not found`,
      );
    }

    return membership;
  }

  private async buildOrganizationFolio() {
    const [result] = await this.organizationsRepository.manager.query(
      `SELECT nextval('organizations_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `O${String(folioNumber).padStart(5, '0')}`;
  }
}
