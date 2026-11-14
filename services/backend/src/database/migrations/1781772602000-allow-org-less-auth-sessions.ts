import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowOrgLessAuthSessions1781772602000 implements MigrationInterface {
  name = 'AllowOrgLessAuthSessions1781772602000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "auth_sessions" WHERE "organization_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
  }
}
