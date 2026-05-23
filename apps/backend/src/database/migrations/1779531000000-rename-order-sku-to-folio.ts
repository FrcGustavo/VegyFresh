import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameOrderSkuToFolio1779531000000 implements MigrationInterface {
  name = 'RenameOrderSkuToFolio1779531000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME COLUMN "sku" TO "folio"`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "orders_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );
    await queryRunner.query(
      `WITH numbered_orders AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS folio_number
        FROM orders
      )
      UPDATE orders o
      SET folio = 'P' || LPAD(numbered_orders.folio_number::text, 5, '0')
      FROM numbered_orders
      WHERE o.id = numbered_orders.id`,
    );
    await queryRunner.query(
      `SELECT setval('orders_folio_seq', COALESCE((SELECT COUNT(*) FROM orders), 0) + 1, false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "orders_folio_seq"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME COLUMN "folio" TO "sku"`,
    );
  }
}
