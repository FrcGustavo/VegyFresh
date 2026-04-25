export class CreateRoleDto {
  name!: string;
  permissions?: Record<string, unknown>[];
}
