import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';

describe('AuthController', () => {
  const authServiceMock = { me: jest.fn() };
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(authServiceMock as unknown as AuthService);
    jest.clearAllMocks();
  });

  it('delegates the current Keycloak identity profile lookup', async () => {
    const user = {
      sub: 'user-1',
      email: 'owner@example.com',
      org_id: 'org-1',
      role: 'owner',
      permissions: ['users:manage'],
    };
    authServiceMock.me.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await controller.me(user);

    expect(authServiceMock.me).toHaveBeenCalledWith(user);
    expect(result).toEqual({ user: { id: 'user-1' } });
  });
});
