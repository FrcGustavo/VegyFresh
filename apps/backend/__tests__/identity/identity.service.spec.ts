import { UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../../src/identity/identity.service';

describe('IdentityService', () => {
  const identities = { findOne: jest.fn() };
  const users = { findOne: jest.fn() };
  const clients = { findOne: jest.fn() };
  const service = new IdentityService(
    identities as never,
    users as never,
    clients as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('resolves a user using only the linked account, organization and role permissions', async () => {
    identities.findOne.mockResolvedValue({ user_id: 'user-1' });
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'database@example.test',
      organization_id: 'org-1',
      organization: { id: 'org-1' },
      role: {
        name: 'manager',
        permissions: [
          { resource: 'orders', action: 'read' },
          { resource: 'orders', action: 'read' },
        ],
      },
    });
    await expect(service.resolveUser('issuer', 'subject')).resolves.toEqual({
      sub: 'user-1',
      email: 'database@example.test',
      org_id: 'org-1',
      role: 'manager',
      permissions: ['orders:read'],
    });
    expect(identities.findOne).toHaveBeenCalledWith({
      where: { issuer: 'issuer', subject: 'subject', identity_type: 'user' },
    });
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      relations: { role: true, organization: true },
    });
    expect(clients.findOne).not.toHaveBeenCalled();
  });

  it('resolves a portal client with its database organization', async () => {
    identities.findOne.mockResolvedValue({ client_id: 'client-1' });
    clients.findOne.mockResolvedValue({
      id: 'client-1',
      email: null,
      organization_id: 'org-2',
      organization: { id: 'org-2' },
    });
    await expect(
      service.resolvePortalClient('issuer', 'subject'),
    ).resolves.toEqual({
      sub: 'client-1',
      email: '',
      organization_id: 'org-2',
      type: 'portal-client',
    });
    expect(identities.findOne).toHaveBeenCalledWith({
      where: {
        issuer: 'issuer',
        subject: 'subject',
        identity_type: 'portal-client',
      },
    });
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it('rejects unlinked and invalid lookup keys without searching by email', async () => {
    identities.findOne.mockResolvedValue(null);
    await expect(
      service.resolveUser('issuer', 'email@example.test'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.resolvePortalClient('issuer', ''),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.resolveUser(undefined as never, 'subject'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(identities.findOne).toHaveBeenCalledTimes(1);
    expect(users.findOne).not.toHaveBeenCalled();
    expect(clients.findOne).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {
      id: 'user-1',
      organization_id: null,
      role: { name: 'owner', permissions: [] },
    },
    {
      id: 'user-1',
      organization_id: 'org-1',
      organization: null,
      role: { name: 'owner', permissions: [] },
    },
    {
      id: 'user-1',
      organization_id: 'org-1',
      organization: { id: 'other' },
      role: { name: 'owner', permissions: [] },
    },
    {
      id: 'user-1',
      organization_id: 'org-1',
      organization: { id: 'org-1' },
      role: null,
    },
    {
      id: 'user-1',
      organization_id: 'org-1',
      organization: { id: 'org-1' },
      role: { name: 'owner', permissions: null },
    },
  ])('rejects a missing or incomplete linked user %#', async (user) => {
    identities.findOne.mockResolvedValue({ user_id: 'user-1' });
    users.findOne.mockResolvedValue(user);
    await expect(
      service.resolveUser('issuer', 'subject'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    null,
    { id: 'client-1', organization_id: null },
    { id: 'client-1', organization_id: 'org-1', organization: null },
    { id: 'client-1', organization_id: 'org-1', organization: { id: 'other' } },
  ])(
    'rejects a missing or incomplete linked portal client %#',
    async (client) => {
      identities.findOne.mockResolvedValue({ client_id: 'client-1' });
      clients.findOne.mockResolvedValue(client);
      await expect(
        service.resolvePortalClient('issuer', 'subject'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects mappings without the expected target', async () => {
    identities.findOne.mockResolvedValue({ user_id: null, client_id: null });
    await expect(
      service.resolveUser('issuer', 'subject'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.resolvePortalClient('issuer', 'subject'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.findOne).not.toHaveBeenCalled();
    expect(clients.findOne).not.toHaveBeenCalled();
  });
});
