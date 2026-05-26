import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerPortalV1Foundation1782200000000
  implements MigrationInterface
{
  name = 'AddCustomerPortalV1Foundation1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
            AND t.typname = 'orders_status_enum'
        ) THEN
          CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DELIVERED', 'IN_PROGRESS', 'CANCELED');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'IN_PROGRESS'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'CANCELED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_origin_enum" ADD VALUE IF NOT EXISTS 'ADMIN'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_origin_enum" ADD VALUE IF NOT EXISTS 'PORTAL'`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "client_portal_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "password_hash" text,
        "password_setup_token_hash" text,
        "password_setup_expires_at" TIMESTAMP,
        "last_portal_login_at" TIMESTAMP,
        "portal_access_activated_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_portal_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_portal_accounts_client" UNIQUE ("client_id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_client_portal_accounts_setup_expires" ON "client_portal_accounts" ("password_setup_expires_at") WHERE "password_setup_token_hash" IS NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_portal_accounts_client'
        ) THEN
          ALTER TABLE "client_portal_accounts"
          ADD CONSTRAINT "FK_client_portal_accounts_client"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "portal_auth_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "refresh_token_hash" text NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portal_auth_sessions_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_auth_sessions_client_org" ON "portal_auth_sessions" ("client_id", "organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portal_auth_sessions_org" ON "portal_auth_sessions" ("organization_id")`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_portal_auth_sessions_client'
        ) THEN
          ALTER TABLE "portal_auth_sessions"
          ADD CONSTRAINT "FK_portal_auth_sessions_client"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_portal_auth_sessions_organization'
        ) THEN
          ALTER TABLE "portal_auth_sessions"
          ADD CONSTRAINT "FK_portal_auth_sessions_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal_auth_sessions" DROP CONSTRAINT IF EXISTS "FK_portal_auth_sessions_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portal_auth_sessions" DROP CONSTRAINT IF EXISTS "FK_portal_auth_sessions_client"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_portal_auth_sessions_org"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_portal_auth_sessions_client_org"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "portal_auth_sessions"`);

    await queryRunner.query(
      `ALTER TABLE "client_portal_accounts" DROP CONSTRAINT IF EXISTS "FK_client_portal_accounts_client"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_client_portal_accounts_setup_expires"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "client_portal_accounts"`);
  }
}
