import { UnauthorizedException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AuthService } from 'src/auth/auth.service';

describe('AuthService profile projection', () => {
  const usersRepository = { findOne: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(usersRepository as never);
    jest.clearAllMocks();
  });

  it('loads the linked user, organization, and role in the principal organization', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      email: 'owner@example.com',
      organization: { id: 'org-1', name: 'Org 1', folio: 'O00001' },
      role: {
        id: 'role-owner',
        name: 'owner',
        permissions: [{ action: '*', resource: '*' }],
      },
    });

    const result = await service.me({
      sub: 'user-1',
      email: 'owner@example.com',
      org_id: 'org-1',
      role: 'owner',
      permissions: ['attacker:permission'],
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1', organization_id: 'org-1' },
      relations: { role: true, organization: true },
    });
    expect(result).toMatchObject({
      user: { id: 'user-1', email: 'owner@example.com' },
      organization: { id: 'org-1' },
      role: {
        id: 'role-owner',
        name: 'owner',
        permissions: ['*'],
      },
    });
  });

  it('uses the org-less profile lookup for users without an organization', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      email: 'owner@example.com',
      organization: null,
      role: { id: 'role-owner', name: 'owner', permissions: [] },
    });

    await service.me({
      sub: 'user-1',
      email: 'owner@example.com',
      org_id: '',
      role: 'owner',
      permissions: [],
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1', organization_id: IsNull() },
      relations: { role: true, organization: true },
    });
  });

  it('rejects a profile that is no longer active in its organization', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.me({
        sub: 'user-1',
        email: 'owner@example.com',
        org_id: 'org-1',
        role: 'owner',
        permissions: [],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
