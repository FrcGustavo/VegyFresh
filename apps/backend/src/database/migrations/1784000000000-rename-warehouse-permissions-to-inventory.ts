import { MigrationInterface, QueryRunner } from 'typeorm';

type RoleRow = {
  id: string;
  permissions: Array<Record<string, unknown> | string> | null;
};

export class RenameWarehousePermissionsToInventory1784000000000 implements MigrationInterface {
  name = 'RenameWarehousePermissionsToInventory1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT id, permissions FROM "roles"`,
    )) as RoleRow[];

    for (const row of rows) {
      const permissions = this.normalizePermissions(row.permissions);
      const nextPermissions = permissions.map((permission) => {
        if (permission === 'warehouse:read') return 'inventory:read';
        if (permission === 'warehouse:manage') return 'inventory:manage';
        return permission;
      });
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = $1::jsonb WHERE "id" = $2`,
        [JSON.stringify(nextPermissions), row.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT id, permissions FROM "roles"`,
    )) as RoleRow[];

    for (const row of rows) {
      const permissions = this.normalizePermissions(row.permissions);
      const nextPermissions = permissions.map((permission) => {
        if (permission === 'inventory:read') return 'warehouse:read';
        if (permission === 'inventory:manage') return 'warehouse:manage';
        return permission;
      });
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = $1::jsonb WHERE "id" = $2`,
        [JSON.stringify(nextPermissions), row.id],
      );
    }
  }

  private normalizePermissions(
    permissions: Array<Record<string, unknown> | string> | null,
  ) {
    const normalized: string[] = [];
    for (const permission of permissions ?? []) {
      if (typeof permission === 'string') {
        const trimmed = permission.trim();
        if (trimmed.length > 0) {
          normalized.push(trimmed);
        }
      }
    }
    return normalized;
  }
}
