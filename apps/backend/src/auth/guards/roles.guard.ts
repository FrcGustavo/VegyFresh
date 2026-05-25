import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

@Injectable()
export class RolesGuard extends PermissionsGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}
