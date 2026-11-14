import { PortalAuthController } from 'src/portal/portal-auth.controller';
import { PortalAuthService } from 'src/portal/portal-auth.service';

describe('PortalAuthController', () => {
  const serviceMock = { me: jest.fn() };
  let controller: PortalAuthController;

  beforeEach(() => {
    controller = new PortalAuthController(
      serviceMock as unknown as PortalAuthService,
    );
    jest.clearAllMocks();
  });

  it('delegates the current portal identity profile lookup', async () => {
    const user = {
      sub: 'client-1',
      email: 'client@example.com',
      organization_id: 'org-1',
      type: 'portal-client' as const,
    };
    serviceMock.me.mockResolvedValue({
      client: { id: 'client-1', portalEnabled: true },
    });

    const result = await controller.me(user);

    expect(serviceMock.me).toHaveBeenCalledWith(user);
    expect(result).toEqual({
      client: { id: 'client-1', portalEnabled: true },
    });
  });
});
