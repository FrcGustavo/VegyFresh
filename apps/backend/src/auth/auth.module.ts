import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { KeycloakAccessStrategy } from '../identity/strategies/keycloak.strategy';
import { AccessTokenGuard } from './guards/access-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthSession]), IdentityModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeycloakAccessStrategy,
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
