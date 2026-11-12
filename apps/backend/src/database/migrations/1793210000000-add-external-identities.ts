import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalIdentities1793210000000 implements MigrationInterface {
  name = 'AddExternalIdentities1793210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "external_identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "issuer" character varying(512) NOT NULL,
        "subject" character varying(255) NOT NULL,
        "identity_type" character varying(32) NOT NULL,
        "user_id" uuid,
        "client_id" uuid,
        CONSTRAINT "CHK_external_identities_mapping" CHECK (
          ("identity_type" = 'user' AND "user_id" IS NOT NULL AND "client_id" IS NULL) OR
          ("identity_type" = 'portal-client' AND "user_id" IS NULL AND "client_id" IS NOT NULL)
        ),
        CONSTRAINT "PK_external_identities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_external_identities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_external_identities_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_external_identities_issuer_subject_type" ON "external_identities" ("issuer", "subject", "identity_type")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_external_identities_user" ON "external_identities" ("issuer", "user_id") WHERE "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_external_identities_client" ON "external_identities" ("issuer", "client_id") WHERE "client_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "external_identities"`);
  }
}
