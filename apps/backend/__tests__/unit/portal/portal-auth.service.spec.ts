import { UnauthorizedException } from '@nestjs/common';
import { PortalAuthService } from 'src/portal/portal-auth.service';

describe('PortalAuthService profile projection', () => {
  const clientsRepository = { findOneBy: jest.fn() };
  let service: PortalAuthService;

  beforeEach(() => {
    service = new PortalAuthService(clientsRepository as never);
    jest.clearAllMocks();
  });

  it('loads only the portal client mapped to the principal organization', async () => {
    clientsRepository.findOneBy.mockResolvedValue({
      id: 'client-1',
      name: 'Client One',
      email: 'client@example.com',
      organization_id: 'org-1',
    });

    const result = await service.me({
      sub: 'client-1',
      email: 'client@example.com',
      organization_id: 'org-1',
      type: 'portal-client',
    });

    expect(clientsRepository.findOneBy).toHaveBeenCalledWith({
      id: 'client-1',
      organization_id: 'org-1',
    });
    expect(result).toEqual({
      client: {
        id: 'client-1',
        name: 'Client One',
        email: 'client@example.com',
        portalEnabled: true,
      },
    });
  });

  it('rejects a portal client that is no longer active in its organization', async () => {
    clientsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.me({
        sub: 'client-1',
        email: 'client@example.com',
        organization_id: 'org-1',
        type: 'portal-client',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
