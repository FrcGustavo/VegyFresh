import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePurchaseTotalAmount1782000000000 implements MigrationInterface {
  name = 'RemovePurchaseTotalAmount1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP COLUMN IF EXISTS "total_amount"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD COLUMN "total_amount" numeric(12,2)`,
    );
    await queryRunner.query(
      `UPDATE "purchases" p
       SET "total_amount" = COALESCE((
         SELECT SUM(pi."subtotal")::numeric(12,2)
         FROM "purchase_items" pi
         WHERE pi."purchase_id" = p."id"
       ), 0::numeric)`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ALTER COLUMN "total_amount" SET NOT NULL`,
    );
  }
}
