import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeIdToUuid1777156883315 implements MigrationInterface {
  name = 'ChangeIdToUuid1777156883315';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "PK_005269d8574e6fac0493715c308"`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "order_id"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "order_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "product_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_0ec433c1e1d444962d592d86c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e"`,
    );
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_8218c69c7f5a3706662101fa788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "supplier_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "supplier_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_5f64edf713f7612a7dc230e871a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "UQ_product_price_list"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb"`,
    );
    await queryRunner.query(`ALTER TABLE "product_prices" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP COLUMN "product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "product_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP COLUMN "price_list_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "price_list_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_a128558d4718c4913f10cbc0c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT "PK_fd66ee20b065696da25c97fa45a"`,
    );
    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "PK_fd66ee20b065696da25c97fa45a" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_505ba3689ef2763acd6c4fc93a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "price_list_id"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "price_list_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "client_id"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "client_id" uuid NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "user_id" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "role_id" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "UQ_product_price_list" UNIQUE ("product_id", "price_list_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0ec433c1e1d444962d592d86c86" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_5f64edf713f7612a7dc230e871a" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_a128558d4718c4913f10cbc0c86" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_505ba3689ef2763acd6c4fc93a4" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_505ba3689ef2763acd6c4fc93a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_a128558d4718c4913f10cbc0c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_5f64edf713f7612a7dc230e871a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "FK_8218c69c7f5a3706662101fa788"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_0ec433c1e1d444962d592d86c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "UQ_product_price_list"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "permissions" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT "PK_c1433d71a4838793a49dcad46ab"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "user_id"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "user_id" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "client_id"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "client_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "price_list_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "price_list_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "clients" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_505ba3689ef2763acd6c4fc93a4" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" DROP CONSTRAINT "PK_fd66ee20b065696da25c97fa45a"`,
    );
    await queryRunner.query(`ALTER TABLE "price_lists" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_lists" ADD CONSTRAINT "PK_fd66ee20b065696da25c97fa45a" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_a128558d4718c4913f10cbc0c86" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP COLUMN "price_list_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "price_list_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP COLUMN "product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "product_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" DROP CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb"`,
    );
    await queryRunner.query(`ALTER TABLE "product_prices" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "UQ_product_price_list" UNIQUE ("product_id", "price_list_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_5f64edf713f7612a7dc230e871a" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "supplier_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "supplier_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "products" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_prices" ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e"`,
    );
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "suppliers" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0ec433c1e1d444962d592d86c86" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "product_id" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "order_id"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "order_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "PK_005269d8574e6fac0493715c308"`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
