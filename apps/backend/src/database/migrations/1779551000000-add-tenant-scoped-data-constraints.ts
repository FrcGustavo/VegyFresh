import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopedDataConstraints1779551000000 implements MigrationInterface {
  name = 'AddTenantScopedDataConstraints1779551000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "FK_a128558d4718c4913f10cbc0c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_0ec433c1e1d444962d592d86c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_505ba3689ef2763acd6c4fc93a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_a922b820eeef29ac1c6800e826a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "FK_8218c69c7f5a3706662101fa788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "FK_5f64edf713f7612a7dc230e871a"`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "UQ_clients_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "UQ_suppliers_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_products_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_c44ac33a05b144dd0d9ddcf9327"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "UQ_price_lists_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "UQ_4f3c405382ec95189f542668e93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_orders_sku"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "UQ_product_price_list"`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_clients_org_id" UNIQUE ("organization_id", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "UQ_suppliers_org_id" UNIQUE ("organization_id", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_org_id" UNIQUE ("organization_id", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_price_lists_org_id" UNIQUE ("organization_id", "id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_clients_org_folio" UNIQUE ("organization_id", "folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "UQ_suppliers_org_folio" UNIQUE ("organization_id", "folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_org_folio" UNIQUE ("organization_id", "folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_org_sku" UNIQUE ("organization_id", "sku")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_price_lists_org_folio" UNIQUE ("organization_id", "folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_price_lists_org_name" UNIQUE ("organization_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_org_folio" UNIQUE ("organization_id", "folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "UQ_product_price_list_org" UNIQUE ("organization_id", "product_id", "price_list_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_clients_org_price_list" ON "clients" ("organization_id", "price_list_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_org_supplier" ON "products" ("organization_id", "supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_org_client" ON "orders" ("organization_id", "client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_org_user" ON "orders" ("organization_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_prices_org_product" ON "product_prices" ("organization_id", "product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_prices_org_price_list" ON "product_prices" ("organization_id", "price_list_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_org_price_list" FOREIGN KEY ("organization_id", "price_list_id") REFERENCES "price_lists"("organization_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_org_supplier" FOREIGN KEY ("organization_id", "supplier_id") REFERENCES "suppliers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_org_client" FOREIGN KEY ("organization_id", "client_id") REFERENCES "clients"("organization_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_org_membership" FOREIGN KEY ("organization_id", "user_id") REFERENCES "organization_users"("organization_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_product_prices_org_product" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products"("organization_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_product_prices_org_price_list" FOREIGN KEY ("organization_id", "price_list_id") REFERENCES "price_lists"("organization_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "FK_product_prices_org_price_list"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "FK_product_prices_org_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_org_membership"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_org_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_org_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "FK_clients_org_price_list"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_prices_org_price_list"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_prices_org_product"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_org_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_org_client"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_org_supplier"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_clients_org_price_list"`,
    );

    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT IF EXISTS "UQ_product_price_list_org"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "UQ_orders_org_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "UQ_price_lists_org_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "UQ_price_lists_org_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_products_org_sku"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_products_org_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "UQ_suppliers_org_folio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "UQ_clients_org_folio"`,
    );

    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "UQ_price_lists_org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "UQ_products_org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "UQ_suppliers_org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "UQ_clients_org_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_clients_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "UQ_suppliers_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_products_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_price_lists_folio" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "UQ_4f3c405382ec95189f542668e93" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_sku" UNIQUE ("folio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "UQ_product_price_list" UNIQUE ("product_id", "price_list_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_a128558d4718c4913f10cbc0c86" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0ec433c1e1d444962d592d86c86" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_505ba3689ef2763acd6c4fc93a4" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_5f64edf713f7612a7dc230e871a" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
