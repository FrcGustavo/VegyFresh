import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { ExternalIdentity } from './entities/external-identity.entity';
import { IdentityService } from './identity.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalIdentity, User, Client])],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
