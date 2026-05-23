import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderDescription1779532000000 implements MigrationInterface {
  name = 'AddOrderDescription1779532000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "description" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "description"`);
  }
}
