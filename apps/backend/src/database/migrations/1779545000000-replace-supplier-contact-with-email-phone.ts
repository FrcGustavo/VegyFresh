import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSupplierContactWithEmailPhone1779545000000 implements MigrationInterface {
  name = 'ReplaceSupplierContactWithEmailPhone1779545000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "phone_number" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "contact_info"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "suppliers" ADD "contact_info" text`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN "phone_number"`,
    );
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "email"`);
  }
}
