import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductUnit1779537000000 implements MigrationInterface {
  name = 'AddProductUnit1779537000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."products_unit_enum" AS ENUM('kg', 'pz')`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "unit" "public"."products_unit_enum" NOT NULL DEFAULT 'pz'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "unit"`);
    await queryRunner.query(`DROP TYPE "public"."products_unit_enum"`);
  }
}
