import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLocalAuthentication1793210003000 implements MigrationInterface {
  name = 'RemoveLocalAuthentication1793210003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "portal_auth_sessions"');
    await queryRunner.query('DROP TABLE "auth_sessions"');
    await queryRunner.query(
      'ALTER TABLE "clients" DROP COLUMN "password_hash"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "password_hash"');
  }

  public down(): Promise<void> {
    throw new Error(
      'Local authentication data was deleted. Restore a database backup to revert this migration.',
    );
  }
}
