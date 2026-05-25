import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopedOrderItems1779740000000 implements MigrationInterface {
  name = 'AddTenantScopedOrderItems1779740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_9263386c35b6b242540f9493b00"`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "organization_id" uuid`,
    );

    await queryRunner.query(
      `WITH order_org AS (
        SELECT id, organization_id
        FROM orders
      )
      UPDATE "order_items" oi
      SET "organization_id" = order_org.organization_id
      FROM order_org
      WHERE oi.order_id = order_org.id
        AND oi.organization_id IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "organization_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_org_id" UNIQUE ("organization_id", "id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_org" ON "order_items" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_org_order" ON "order_items" ("organization_id", "order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_org_product" ON "order_items" ("organization_id", "product_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_org_order" FOREIGN KEY ("organization_id", "order_id") REFERENCES "orders"("organization_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_org_product" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_org_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_org_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_organization"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_items_org_product"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_org_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_org"`);

    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_orders_org_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "organization_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
