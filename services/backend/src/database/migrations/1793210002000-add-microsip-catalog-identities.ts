import { MigrationInterface, QueryRunner } from 'typeorm';

const tables = ['products', 'price_lists', 'clients'];

export class AddMicrosipCatalogIdentities1793210002000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN "microsip_company" varchar(100),
        ADD COLUMN "microsip_external_id" varchar(100),
        ADD CONSTRAINT "UQ_${table}_microsip"
          UNIQUE ("organization_id", "microsip_company", "microsip_external_id"),
        ADD CONSTRAINT "CK_${table}_microsip_pair"
          CHECK (("microsip_company" IS NULL) = ("microsip_external_id" IS NULL))
      `);
    }
    await queryRunner.query(`
      CREATE TABLE "microsip_catalog_import_receipts" (
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "idempotency_key" uuid NOT NULL,
        "request_hash" varchar(64) NOT NULL,
        "result" jsonb NOT NULL,
        PRIMARY KEY ("organization_id", "idempotency_key")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "microsip_catalog_import_receipts"');
    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP CONSTRAINT "CK_${table}_microsip_pair",
        DROP CONSTRAINT "UQ_${table}_microsip",
        DROP COLUMN "microsip_external_id",
        DROP COLUMN "microsip_company"
      `);
    }
  }
}
