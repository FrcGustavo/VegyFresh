import {
  CanActivate,
  ExecutionContext,
  Injectable,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';
import { RefreshTokenGuard } from '../src/auth/guards/refresh-token.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { OrganizationUserRole } from '../src/organizations/entities/organization-user.entity';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

type TestUser = {
  sub: string;
  email: string;
  org_id: string;
  membership_id: string;
  role: OrganizationUserRole;
  permissions: string[];
  session_id: string;
};

const accessUsersByToken: Record<string, TestUser> = {
  'token-org1-owner': {
    sub: 'user-1',
    email: 'owner@vegyfresh.com',
    org_id: 'org-1',
    membership_id: 'membership-org1',
    role: OrganizationUserRole.OWNER,
    permissions: ['*'],
    session_id: 'session-org1',
  },
  'token-org2-owner': {
    sub: 'user-2',
    email: 'owner2@vegyfresh.com',
    org_id: 'org-2',
    membership_id: 'membership-org2',
    role: OrganizationUserRole.OWNER,
    permissions: ['*'],
    session_id: 'session-org2',
  },
};

const refreshUsersByToken: Record<string, TestUser> = {
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature':
    accessUsersByToken['token-org1-owner'],
};

@Injectable()
class FakeAccessTokenGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: TestUser;
    }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || !accessUsersByToken[token]) {
      throw new UnauthorizedException('Invalid access token');
    }
    request.user = accessUsersByToken[token];
    return true;
  }
}

@Injectable()
class FakeRefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      body?: { refresh_token?: string };
      user?: TestUser;
    }>();
    const token = request.body?.refresh_token;
    if (!token || !refreshUsersByToken[token]) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    request.user = refreshUsersByToken[token];
    return true;
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const authService = {
    signup: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
  };
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    authService.signup.mockResolvedValue({
      access_token: 'token-org1-owner',
      refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
    });
    authService.login.mockResolvedValue({
      access_token: 'token-org1-owner',
      refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
    });
    authService.refreshToken.mockResolvedValue({
      access_token: 'new-token-org1-owner',
      refresh_token: 'new-refresh-org1',
    });
    authService.logout.mockResolvedValue({ revoked: true });

    usersService.findOne.mockImplementation((id: string, orgId: string) => {
      if (id === 'user-org2' && orgId !== 'org-2') {
        throw new NotFoundException(
          `User with id ${id} was not found in organization ${orgId}`,
        );
      }
      return {
        id,
        organization_id: orgId,
      };
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        {
          provide: APP_GUARD,
          useClass: FakeAccessTokenGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
    })
      .overrideGuard(RefreshTokenGuard)
      .useClass(FakeRefreshTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('auth lifecycle: signup/login/refresh/logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        name: 'Owner',
        email: 'owner@vegyfresh.com',
        password: 'super-secure-password',
        organization_name: 'Org 1',
      })
      .expect(201)
      .expect({
        access_token: 'token-org1-owner',
        refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
      });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'owner@vegyfresh.com',
        password: 'super-secure-password',
      })
      .expect(201)
      .expect({
        access_token: 'token-org1-owner',
        refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
      });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refresh_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
      })
      .expect(201)
      .expect({
        access_token: 'new-token-org1-owner',
        refresh_token: 'new-refresh-org1',
      });

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer token-org1-owner')
      .expect(201)
      .expect({ revoked: true });
  });

  it('denies cross-tenant user access', async () => {
    await request(app.getHttpServer())
      .get('/users/user-org1')
      .set('Authorization', 'Bearer token-org1-owner')
      .expect(200)
      .expect({
        id: 'user-org1',
        organization_id: 'org-1',
      });

    await request(app.getHttpServer())
      .get('/users/user-org2')
      .set('Authorization', 'Bearer token-org1-owner')
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
