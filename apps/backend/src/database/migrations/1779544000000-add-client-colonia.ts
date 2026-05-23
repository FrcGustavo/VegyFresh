import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientColonia1779544000000 implements MigrationInterface {
  name = 'AddClientColonia1779544000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "colonia" character varying(120)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "colonia"`);
  }
}
