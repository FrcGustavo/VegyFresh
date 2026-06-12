import { UnauthorizedException } from '@nestjs/common';
import { PortalAuthService } from 'src/portal/portal-auth.service';

describe('PortalAuthService', () => {
  const clientsRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const portalSessionsRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn((value) => value),
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
      service.login({ email: 'missing@vegyfresh.com', password: 'x' } as never),
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
