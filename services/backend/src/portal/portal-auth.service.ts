import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';

@Injectable()
export class PortalAuthService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async me(user: AuthenticatedPortalClient) {
    const client = await this.clientsRepository.findOneBy({
      id: user.sub,
      organization_id: user.organization_id,
    });
    if (!client) {
      throw new UnauthorizedException('Client is not active in portal');
    }

    return {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        portalEnabled: true,
      },
    };
  }
}
