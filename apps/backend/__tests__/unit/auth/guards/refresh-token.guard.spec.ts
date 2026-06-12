import { RefreshTokenGuard } from 'src/auth/guards/refresh-token.guard';

describe('RefreshTokenGuard', () => {
  it('should be defined', () => {
    const guard = new RefreshTokenGuard();

    expect(guard).toBeDefined();
  });
});
