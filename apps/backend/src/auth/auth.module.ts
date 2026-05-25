import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationUser } from '../organizations/entities/organization-user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      Role,
      Organization,
      OrganizationUser,
      AuthSession,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
