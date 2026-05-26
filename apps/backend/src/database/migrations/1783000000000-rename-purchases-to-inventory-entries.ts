import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePurchasesToInventoryEntries1783000000000 implements MigrationInterface {
  name = 'RenamePurchasesToInventoryEntries1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER SEQUENCE IF EXISTS "purchases_folio_seq" RENAME TO "inventory_entries_folio_seq"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" RENAME TO "inventory_entries"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_items" RENAME TO "inventory_entry_items"`,
    );

    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_purchases_org" RENAME TO "IDX_inventory_entries_org"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_purchases_supplier" RENAME TO "IDX_inventory_entries_supplier"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_purchases_date" RENAME TO "IDX_inventory_entries_date"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_purchase_items_purchase" RENAME TO "IDX_inventory_entry_items_entry"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_purchase_items_product" RENAME TO "IDX_inventory_entry_items_product"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_inventory_entry_items_product" RENAME TO "IDX_purchase_items_product"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_inventory_entry_items_entry" RENAME TO "IDX_purchase_items_purchase"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_inventory_entries_date" RENAME TO "IDX_purchases_date"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_inventory_entries_supplier" RENAME TO "IDX_purchases_supplier"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "IDX_inventory_entries_org" RENAME TO "IDX_purchases_org"`,
    );

    await queryRunner.query(
      `ALTER TABLE "inventory_entry_items" RENAME TO "purchase_items"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_entries" RENAME TO "purchases"`,
    );
    await queryRunner.query(
      `ALTER SEQUENCE IF EXISTS "inventory_entries_folio_seq" RENAME TO "purchases_folio_seq"`,
    );
  }
}
