import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFolioToCoreResources1779541000000 implements MigrationInterface {
  name = 'AddFolioToCoreResources1779541000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "clients_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "suppliers_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "users_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "price_lists_folio_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD "folio" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "folio" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "folio" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD "folio" character varying(40)`,
    );

    await queryRunner.query(
      `WITH numbered_clients AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS folio_number
        FROM clients
      )
      UPDATE clients c
      SET folio = 'C' || LPAD(numbered_clients.folio_number::text, 5, '0')
      FROM numbered_clients
      WHERE c.id = numbered_clients.id`,
    );
    await queryRunner.query(
      `WITH numbered_suppliers AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS folio_number
        FROM suppliers
      )
      UPDATE suppliers s
      SET folio = 'S' || LPAD(numbered_suppliers.folio_number::text, 5, '0')
      FROM numbered_suppliers
      WHERE s.id = numbered_suppliers.id`,
    );
    await queryRunner.query(
      `WITH numbered_users AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS folio_number
        FROM users
      )
      UPDATE users u
      SET folio = 'U' || LPAD(numbered_users.folio_number::text, 5, '0')
      FROM numbered_users
      WHERE u.id = numbered_users.id`,
    );
    await queryRunner.query(
      `WITH numbered_price_lists AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS folio_number
        FROM price_lists
      )
      UPDATE price_lists pl
      SET folio = 'L' || LPAD(numbered_price_lists.folio_number::text, 5, '0')
      FROM numbered_price_lists
      WHERE pl.id = numbered_price_lists.id`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "folio" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ALTER COLUMN "folio" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "folio" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ALTER COLUMN "folio" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_clients_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "UQ_suppliers_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_price_lists_folio" UNIQUE ("folio")`,
    );

    await queryRunner.query(
      `SELECT setval('clients_folio_seq', COALESCE((SELECT COUNT(*) FROM clients), 0) + 1, false)`,
    );
    await queryRunner.query(
      `SELECT setval('suppliers_folio_seq', COALESCE((SELECT COUNT(*) FROM suppliers), 0) + 1, false)`,
    );
    await queryRunner.query(
      `SELECT setval('users_folio_seq', COALESCE((SELECT COUNT(*) FROM users), 0) + 1, false)`,
    );
    await queryRunner.query(
      `SELECT setval('price_lists_folio_seq', COALESCE((SELECT COUNT(*) FROM price_lists), 0) + 1, false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT "UQ_price_lists_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "UQ_suppliers_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "UQ_clients_folio"`,
    );

    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "folio"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "folio"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "folio"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "folio"`);

    await queryRunner.query(`DROP SEQUENCE IF EXISTS "price_lists_folio_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "users_folio_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "suppliers_folio_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "clients_folio_seq"`);
  }
}
