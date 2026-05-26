import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovePortalAuthFieldsToClients1785000000000 implements MigrationInterface {
  name = 'MovePortalAuthFieldsToClients1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_hash" text`,
    );
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

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.client_portal_accounts') IS NOT NULL THEN
          UPDATE "clients" c
          SET
            "password_hash" = COALESCE(c."password_hash", p."password_hash"),
            "password_setup_token_hash" = COALESCE(c."password_setup_token_hash", p."password_setup_token_hash"),
            "password_setup_expires_at" = COALESCE(c."password_setup_expires_at", p."password_setup_expires_at"),
            "last_portal_login_at" = COALESCE(c."last_portal_login_at", p."last_portal_login_at"),
            "portal_access_activated_at" = COALESCE(c."portal_access_activated_at", p."portal_access_activated_at")
          FROM "client_portal_accounts" p
          WHERE p."client_id" = c."id";

          ALTER TABLE "client_portal_accounts"
          DROP CONSTRAINT IF EXISTS "FK_client_portal_accounts_client";
          DROP INDEX IF EXISTS "IDX_client_portal_accounts_setup_expires";
          DROP TABLE IF EXISTS "client_portal_accounts";
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`
      INSERT INTO "client_portal_accounts" (
        "client_id",
        "password_hash",
        "password_setup_token_hash",
        "password_setup_expires_at",
        "last_portal_login_at",
        "portal_access_activated_at"
      )
      SELECT
        c."id",
        c."password_hash",
        c."password_setup_token_hash",
        c."password_setup_expires_at",
        c."last_portal_login_at",
        c."portal_access_activated_at"
      FROM "clients" c
      WHERE c."password_hash" IS NOT NULL
         OR c."password_setup_token_hash" IS NOT NULL
         OR c."password_setup_expires_at" IS NOT NULL
         OR c."last_portal_login_at" IS NOT NULL
         OR c."portal_access_activated_at" IS NOT NULL
      ON CONFLICT ("client_id") DO UPDATE SET
        "password_hash" = EXCLUDED."password_hash",
        "password_setup_token_hash" = EXCLUDED."password_setup_token_hash",
        "password_setup_expires_at" = EXCLUDED."password_setup_expires_at",
        "last_portal_login_at" = EXCLUDED."last_portal_login_at",
        "portal_access_activated_at" = EXCLUDED."portal_access_activated_at";
    `);

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
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN IF EXISTS "password_hash"`,
    );
  }
}
