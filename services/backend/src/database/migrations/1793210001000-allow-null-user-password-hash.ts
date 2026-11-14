import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullUserPasswordHash1793210001000 implements MigrationInterface {
  name = 'AllowNullUserPasswordHash1793210001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      `SELECT COUNT(*)::int AS "count" FROM "users" WHERE "password_hash" IS NULL`,
    )) as [{ count: number }];
    if (count > 0) {
      throw new Error(
        'Cannot require legacy user password hashes while passwordless users exist',
      );
    }

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`,
    );
  }
}
