import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyUserOrganizationModel1779700000000 implements MigrationInterface {
  name = 'SimplifyUserOrganizationModel1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'organization_users'
        ) THEN
          WITH organization_source AS (
            SELECT DISTINCT ON (ou.user_id)
              ou.user_id,
              ou.organization_id
            FROM organization_users ou
            WHERE ou.is_active = true
            ORDER BY ou.user_id, ou.created_at ASC
          )
          UPDATE users u
          SET organization_id = source.organization_id
          FROM organization_source source
          WHERE u.id = source.user_id
            AND u.organization_id IS NULL;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      WITH default_org AS (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      UPDATE users
      SET organization_id = (SELECT id FROM default_org)
      WHERE organization_id IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_org_id'
        ) THEN
          ALTER TABLE "users"
          ADD CONSTRAINT "UQ_users_org_id" UNIQUE ("organization_id", "id");
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_org" ON "users" ("organization_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_organization'
        ) THEN
          ALTER TABLE "users"
          ADD CONSTRAINT "FK_users_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT IF EXISTS "FK_auth_sessions_membership_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT IF EXISTS "FK_auth_sessions_membership_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT IF EXISTS "FK_auth_sessions_membership"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP COLUMN IF EXISTS "membership_id"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_membership"`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_org_membership"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_orders_org_user'
        ) THEN
          ALTER TABLE "orders"
          ADD CONSTRAINT "FK_orders_org_user"
          FOREIGN KEY ("organization_id", "user_id")
          REFERENCES "users"("organization_id", "id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_users_org"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_users_user"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_users" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organization_users_role_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_users_role_enum" AS ENUM('owner', 'admin', 'member')`,
    );

    await queryRunner.query(`
      CREATE TABLE "organization_users" (
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
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "organization_users" ADD CONSTRAINT "FK_organization_users_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_users" ADD CONSTRAINT "FK_organization_users_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_users_org" ON "organization_users" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_users_user" ON "organization_users" ("user_id")`,
    );

    await queryRunner.query(`
      INSERT INTO organization_users (organization_id, user_id, role, is_active)
      SELECT
        u.organization_id,
        u.id,
        CASE LOWER(COALESCE(r.name, 'member'))
          WHEN 'owner' THEN 'owner'::organization_users_role_enum
          WHEN 'admin' THEN 'admin'::organization_users_role_enum
          ELSE 'member'::organization_users_role_enum
        END,
        true
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM organization_users ou
        WHERE ou.organization_id = u.organization_id
          AND ou.user_id = u.id
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_org_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_org_membership" FOREIGN KEY ("organization_id", "user_id") REFERENCES "organization_users"("organization_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "membership_id" uuid`,
    );
    await queryRunner.query(`
      UPDATE auth_sessions session
      SET membership_id = ou.id
      FROM organization_users ou
      WHERE session.user_id = ou.user_id
        AND session.organization_id = ou.organization_id
        AND session.membership_id IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ALTER COLUMN "membership_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auth_sessions_membership" ON "auth_sessions" ("membership_id")`,
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
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_org_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_org"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"`,
    );
  }
}
