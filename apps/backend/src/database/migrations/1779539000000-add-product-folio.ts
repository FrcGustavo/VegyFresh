import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFolio1779539000000 implements MigrationInterface {
  name = 'AddProductFolio1779539000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "products_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "folio" character varying(40)`,
    );
    await queryRunner.query(
      `WITH numbered_products AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS folio_number
        FROM products
      )
      UPDATE products p
      SET folio = 'P' || LPAD(numbered_products.folio_number::text, 5, '0')
      FROM numbered_products
      WHERE p.id = numbered_products.id`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "folio" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `SELECT setval('products_folio_seq', COALESCE((SELECT COUNT(*) FROM products), 0) + 1, false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_products_folio"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "folio"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "products_folio_seq"`);
  }
}
