import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderSkuAndDeliveryDate1779530000000 implements MigrationInterface {
  name = 'AddOrderSkuAndDeliveryDate1779530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "sku" character varying(40)`,
    );
    await queryRunner.query(
      `UPDATE "orders" SET "sku" = 'ORD-' || SUBSTRING(REPLACE(CAST("id" AS text), '-', ''), 1, 8) WHERE "sku" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "sku" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_sku" UNIQUE ("sku")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "delivery_date" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "delivery_date"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_sku"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "sku"`);
  }
}
