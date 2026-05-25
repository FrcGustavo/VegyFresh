import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationLogoUrl1779666200000 implements MigrationInterface {
  name = 'AddOrganizationLogoUrl1779666200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" ADD "logo_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "logo_url"`,
    );
  }
}
