import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { OrganizationUser } from '../organizations/entities/organization-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, OrganizationUser])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
