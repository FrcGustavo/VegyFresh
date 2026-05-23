import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientAddressBreakdown1779543000000 implements MigrationInterface {
  name = 'AddClientAddressBreakdown1779543000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "country" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "state" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "city" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "postal_code" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "external_number" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "internal_number" character varying(30)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "internal_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "external_number"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "postal_code"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "state"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "country"`);
  }
}
