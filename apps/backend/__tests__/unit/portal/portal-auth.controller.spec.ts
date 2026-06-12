import { PortalAuthController } from 'src/portal/portal-auth.controller';
import { PortalAuthService } from 'src/portal/portal-auth.service';

describe('PortalAuthController', () => {
  const serviceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  };

  let controller: PortalAuthController;

  beforeEach(() => {
    controller = new PortalAuthController(
      serviceMock as unknown as PortalAuthService,
    );
    jest.clearAllMocks();
  });

  it('delegates login', async () => {
    const dto = { email: 'client@vegyfresh.com', password: 'secret' };
    serviceMock.login.mockResolvedValue({ access_token: 'token' });

    const result = await controller.login(dto);

    expect(serviceMock.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'token' });
  });

  it('delegates refresh', async () => {
    const dto = { refresh_token: 'refresh' };
    serviceMock.refresh.mockResolvedValue({ access_token: 'new-token' });

    const result = await controller.refresh(dto);

    expect(serviceMock.refresh).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'new-token' });
  });

  it('delegates logout', async () => {
    const user = { sub: 'client-1', organization_id: 'org-1' };
    serviceMock.logout.mockResolvedValue({ revoked: true });

    const result = await controller.logout(user as never);

    expect(serviceMock.logout).toHaveBeenCalledWith(user);
    expect(result).toEqual({ revoked: true });
  });
});
