import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationsAuthAndTenancy1779550000000 implements MigrationInterface {
  name = 'AddOrganizationsAuthAndTenancy1779550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."organization_users_role_enum" AS ENUM('owner', 'admin', 'member')`,
    );

    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "organizations_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );

    await queryRunner.query(
      `CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "folio" character varying(40) NOT NULL,
        "name" character varying(255) NOT NULL,
        "legal_name" character varying(255),
        "email" character varying(255),
        "phone_number" character varying(30),
        "address" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_folio" UNIQUE ("folio")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "organization_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "public"."organization_users_role_enum" NOT NULL DEFAULT 'member',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_user_membership" UNIQUE ("organization_id", "user_id"),
        CONSTRAINT "UQ_organization_user_id_org" UNIQUE ("id", "organization_id"),
        CONSTRAINT "UQ_organization_user_id_user" UNIQUE ("id", "user_id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "membership_id" uuid NOT NULL,
        "refresh_token_hash" text NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(`ALTER TABLE "clients" ADD "organization_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "organization_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "organization_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD "organization_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "organization_id" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "organization_id" uuid`);

    await queryRunner.query(
      `INSERT INTO "organizations" ("folio", "name")
       SELECT 'O00001', 'Default Organization'
       WHERE NOT EXISTS (SELECT 1 FROM "organizations")`,
    );

    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "clients"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "suppliers"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "products"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "price_lists"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "product_prices"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE "orders"
      SET "organization_id" = (SELECT id FROM default_org)
      WHERE "organization_id" IS NULL`,
    );

    await queryRunner.query(
      `WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      INSERT INTO "organization_users" ("organization_id", "user_id", "role", "is_active")
      SELECT default_org.id, users.id, 'owner', true
      FROM users, default_org
      WHERE NOT EXISTS (
        SELECT 1
        FROM organization_users ou
        WHERE ou.organization_id = default_org.id AND ou.user_id = users.id
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "organization_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "organization_users" ADD CONSTRAINT "FK_organization_users_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_users" ADD CONSTRAINT "FK_organization_users_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_membership" FOREIGN KEY ("membership_id") REFERENCES "organization_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_membership_org" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "organization_users"("id", "organization_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_auth_sessions_membership_user" FOREIGN KEY ("membership_id", "user_id") REFERENCES "organization_users"("id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_suppliers_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "FK_price_lists_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_product_prices_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_organization_users_org" ON "organization_users" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_users_user" ON "organization_users" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_user_org" ON "auth_sessions" ("user_id", "organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_sessions_membership" ON "auth_sessions" ("membership_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_org" ON "clients" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_suppliers_org" ON "suppliers" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_org" ON "products" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_price_lists_org" ON "price_lists" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_prices_org" ON "product_prices" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_org" ON "orders" ("organization_id")`,
    );

    await queryRunner.query(
      `SELECT setval(
        'organizations_folio_seq',
        COALESCE(
          (
            SELECT MAX(NULLIF(regexp_replace(folio, '[^0-9]', '', 'g'), '')::bigint)
            FROM organizations
          ),
          0
        ) + 1,
        false
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_prices_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_price_lists_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_suppliers_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clients_org"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_membership"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_user_org"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_users_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_users_org"`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_product_prices_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT "FK_price_lists_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_suppliers_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_organization"`,
    );

    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_membership_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_membership_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_membership"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_auth_sessions_user"`,
    );

    await queryRunner.query(
      `ALTER TABLE "organization_users" DROP CONSTRAINT "FK_organization_users_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_users" DROP CONSTRAINT "FK_organization_users_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_users" DROP CONSTRAINT "UQ_organization_user_id_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_users" DROP CONSTRAINT "UQ_organization_user_id_org"`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "organization_id"`,
    );

    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TABLE "organization_users"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_users_role_enum"`,
    );
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "organizations_folio_seq"`,
    );
  }
}
