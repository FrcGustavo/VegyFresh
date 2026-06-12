import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';

describe('AuthController', () => {
  const authServiceMock = {
    signup: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(authServiceMock as unknown as AuthService);
    jest.clearAllMocks();
  });

  it('delegates signup', async () => {
    const dto = {
      name: 'Owner',
      email: 'owner@vegyfresh.com',
      password: 'password',
    };
    authServiceMock.signup.mockResolvedValue({ id: 'user-1' });

    const result = await controller.signup(dto);

    expect(authServiceMock.signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'user-1' });
  });

  it('delegates login', async () => {
    const dto = { email: 'owner@vegyfresh.com', password: 'password' };
    authServiceMock.login.mockResolvedValue({ access_token: 'token' });

    const result = await controller.login(dto);

    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ access_token: 'token' });
  });

  it('delegates refresh with current user', async () => {
    const dto = { refresh_token: 'refresh-token' };
    const user = { sub: 'user-1' };
    authServiceMock.refreshToken.mockResolvedValue({
      access_token: 'new-token',
    });

    const result = await controller.refresh(dto, user as never);

    expect(authServiceMock.refreshToken).toHaveBeenCalledWith(
      user,
      'refresh-token',
    );
    expect(result).toEqual({ access_token: 'new-token' });
  });

  it('delegates logout', async () => {
    const user = { sub: 'user-1' };
    authServiceMock.logout.mockResolvedValue({ revoked: true });

    const result = await controller.logout(user as never);

    expect(authServiceMock.logout).toHaveBeenCalledWith(user);
    expect(result).toEqual({ revoked: true });
  });
});
