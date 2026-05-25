import { MigrationInterface, QueryRunner } from 'typeorm';

type RoleRow = {
  id: string;
  name: string;
  permissions: Array<Record<string, unknown> | string> | null;
};

export class AddWarehouseAndDecimalStock1781000000000
  implements MigrationInterface
{
  name = 'AddWarehouseAndDecimalStock1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "stock" TYPE numeric(12,3)
       USING "stock"::numeric(12,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "stock" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items"
       ALTER COLUMN "quantity" TYPE numeric(12,3)
       USING "quantity"::numeric(12,3)`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."inventory_movements_movement_type_enum" AS ENUM('IN', 'OUT', 'ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "purchases_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );

    await queryRunner.query(
      `CREATE TABLE "purchases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "folio" character varying(40) NOT NULL,
        "purchase_date" TIMESTAMP NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchases_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchases_org_folio" UNIQUE ("organization_id", "folio")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "purchase_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" numeric(12,3) NOT NULL,
        "unit_cost" numeric(12,2) NOT NULL,
        "subtotal" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_purchase_items_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "user_id" uuid,
        "supplier_id" uuid,
        "purchase_id" uuid,
        "movement_type" "public"."inventory_movements_movement_type_enum" NOT NULL,
        "quantity" numeric(12,3) NOT NULL,
        "previous_stock" numeric(12,3) NOT NULL,
        "new_stock" numeric(12,3) NOT NULL,
        "reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_purchases_org" ON "purchases" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchases_supplier" ON "purchases" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchases_date" ON "purchases" ("purchase_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_items_purchase" ON "purchase_items" ("purchase_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_items_product" ON "purchase_items" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_org" ON "inventory_movements" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_product" ON "inventory_movements" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_created_at" ON "inventory_movements" ("created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_purchases_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_purchases_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_purchases_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_items" ADD CONSTRAINT "FK_purchase_items_purchase" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_items" ADD CONSTRAINT "FK_purchase_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inventory_movements_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inventory_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inventory_movements_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inventory_movements_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" ADD CONSTRAINT "FK_inventory_movements_purchase" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await this.ensureWarehousePermissions(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.removeWarehousePermissions(queryRunner);

    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_purchase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movements" DROP CONSTRAINT "FK_inventory_movements_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_items" DROP CONSTRAINT "FK_purchase_items_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_items" DROP CONSTRAINT "FK_purchase_items_purchase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_purchases_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_purchases_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_purchases_org"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_movements_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inventory_movements_product"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_movements_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_items_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_items_purchase"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchases_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchases_supplier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchases_org"`);

    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP TABLE "purchase_items"`);
    await queryRunner.query(`DROP TABLE "purchases"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_movements_movement_type_enum"`,
    );
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "purchases_folio_seq"`);

    await queryRunner.query(
      `ALTER TABLE "order_items"
       ALTER COLUMN "quantity" TYPE integer
       USING ROUND("quantity")::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "stock" TYPE integer
       USING ROUND("stock")::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "products"
       ALTER COLUMN "stock" SET DEFAULT 0`,
    );
  }

  private async ensureWarehousePermissions(queryRunner: QueryRunner) {
    const rows = (await queryRunner.query(
      `SELECT id, name, permissions FROM "roles" WHERE LOWER(name) IN ('admin', 'member')`,
    )) as RoleRow[];

    const adminRole = rows.find((row) => row.name.toLowerCase() === 'admin');
    const memberRole = rows.find((row) => row.name.toLowerCase() === 'member');

    if (!adminRole) {
      await queryRunner.query(
        `INSERT INTO "roles" ("name", "permissions") VALUES ($1, $2::jsonb)`,
        [
          'admin',
          JSON.stringify([
            'catalog:*',
            'orders:*',
            'users:manage',
            'warehouse:read',
            'warehouse:manage',
          ]),
        ],
      );
    } else {
      const permissions = this.normalizePermissions(adminRole.permissions);
      permissions.add('warehouse:read');
      permissions.add('warehouse:manage');
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = $1::jsonb WHERE "id" = $2`,
        [JSON.stringify(Array.from(permissions)), adminRole.id],
      );
    }

    if (!memberRole) {
      await queryRunner.query(
        `INSERT INTO "roles" ("name", "permissions") VALUES ($1, $2::jsonb)`,
        ['member', JSON.stringify(['catalog:read', 'orders:read', 'warehouse:read'])],
      );
    } else {
      const permissions = this.normalizePermissions(memberRole.permissions);
      permissions.add('warehouse:read');
      permissions.delete('warehouse:manage');
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = $1::jsonb WHERE "id" = $2`,
        [JSON.stringify(Array.from(permissions)), memberRole.id],
      );
    }
  }

  private async removeWarehousePermissions(queryRunner: QueryRunner) {
    const rows = (await queryRunner.query(
      `SELECT id, permissions FROM "roles" WHERE LOWER(name) IN ('admin', 'member')`,
    )) as Array<{ id: string; permissions: Array<Record<string, unknown> | string> | null }>;

    for (const row of rows) {
      const permissions = this.normalizePermissions(row.permissions);
      permissions.delete('warehouse:read');
      permissions.delete('warehouse:manage');
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = $1::jsonb WHERE "id" = $2`,
        [JSON.stringify(Array.from(permissions)), row.id],
      );
    }
  }

  private normalizePermissions(
    permissions: Array<Record<string, unknown> | string> | null,
  ) {
    const normalized = new Set<string>();
    for (const permission of permissions ?? []) {
      if (typeof permission === 'string') {
        const trimmed = permission.trim();
        if (trimmed) {
          normalized.add(trimmed);
        }
        continue;
      }

      const action =
        typeof permission.action === 'string' ? permission.action.trim() : '';
      const resource =
        typeof permission.resource === 'string'
          ? permission.resource.trim()
          : '';
      if (!action || !resource) {
        continue;
      }
      if (action === '*' && resource === '*') {
        normalized.add('*');
      } else if (action === '*') {
        normalized.add(`${resource}:*`);
      } else {
        normalized.add(`${resource}:${action}`);
      }
    }
    return normalized;
  }
}
