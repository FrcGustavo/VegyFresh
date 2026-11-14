import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductSku1781930269000 implements MigrationInterface {
  name = 'RemoveProductSku1781930269000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_products_org_sku"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "sku" character varying(100)`,
    );
    await queryRunner.query(`UPDATE "products" SET "sku" = "folio"`);
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_org_sku" UNIQUE ("organization_id", "sku")`,
    );
  }
}
