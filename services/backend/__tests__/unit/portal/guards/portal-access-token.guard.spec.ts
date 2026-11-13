import { PortalAccessTokenGuard } from 'src/portal/guards/portal-access-token.guard';

describe('PortalAccessTokenGuard', () => {
  it('should be defined', () => {
    const guard = new PortalAccessTokenGuard();

    expect(guard).toBeDefined();
  });
});
