import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePortalClientMetadataColumns1785001000000 implements MigrationInterface {
  name = 'RemovePortalClientMetadataColumns1785001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clients_portal_setup_expires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "portal_access_activated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "last_portal_login_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "password_setup_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "password_setup_token_hash"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_setup_token_hash" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_setup_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_portal_login_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_access_activated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_clients_portal_setup_expires" ON "clients" ("password_setup_expires_at") WHERE "password_setup_token_hash" IS NOT NULL`,
    );
  }
}
