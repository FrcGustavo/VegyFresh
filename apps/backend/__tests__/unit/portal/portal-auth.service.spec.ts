import { UnauthorizedException } from '@nestjs/common';
import { PortalAuthSession } from 'src/portal/entities/portal-auth-session.entity';
import { PortalAuthService } from 'src/portal/portal-auth.service';
import type { DeepPartial } from 'typeorm';

describe('PortalAuthService', () => {
  const clientsRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const portalSessionsRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(
      (value: DeepPartial<PortalAuthSession>): PortalAuthSession =>
        value as PortalAuthSession,
    ),
  };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  let service: PortalAuthService;

  beforeEach(() => {
    service = new PortalAuthService(
      clientsRepository as never,
      portalSessionsRepository as never,
      jwtService as never,
      configService as never,
    );
    jest.clearAllMocks();
  });

  it('rejects login for unknown client', async () => {
    clientsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@vegyfresh.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects logout without session identifier', async () => {
    await expect(
      service.logout({
        sub: 'client-1',
        organization_id: 'org-1',
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
