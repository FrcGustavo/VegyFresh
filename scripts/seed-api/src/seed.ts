import {
  createApiClient,
  createFetchTransport,
  getCollectionItems,
  type ApiClient,
  type Client,
  type Order,
  type PriceList,
  type Product,
  type ProductPrice,
  type Role,
  type Supplier,
  type User,
} from "@vegyfresh/api-client";

type ProductSeed = {
  name: string;
  description: string;
  stock: number;
  retailPrice: number;
  wholesalePrice: number;
};

type SupplierSeed = {
  name: string;
  contactInfo: string;
};

type ClientSeed = {
  name: string;
  phoneNumber: string;
  email: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function logStep(step: string): void {
  console.log(`\n[seed] ${step}`);
}

const TARGET_SUPPLIERS = 25;
const TARGET_PRODUCTS = 100;
const TARGET_CLIENTS = 20;
const TARGET_ORDERS = 50;
const ALL_ITEMS_QUERY = { limit: "500" } as const;
const ALL_ORDERS_QUERY = { limit: 500 } as const;

function pad(value: number): string {
  return value.toString().padStart(3, "0");
}

function createSupplierSeeds(count: number): SupplierSeed[] {
  return Array.from({ length: count }, (_unused, index) => {
    const number = index + 1;
    return {
      name: `Proveedor Agro ${pad(number)}`,
      contactInfo: `compras${number}@proveedoragro.local`,
    };
  });
}

function createClientSeeds(count: number): ClientSeed[] {
  return Array.from({ length: count }, (_unused, index) => {
    const number = index + 1;
    return {
      name: `Cliente Mayorista ${pad(number)}`,
      phoneNumber: `+54911000${number.toString().padStart(4, "0")}`,
      email: `cliente${number}@vegyfresh.local`,
    };
  });
}

function buildProductsForCategory(
  categoryName: string,
  itemNames: string[],
  startPrice: number,
): ProductSeed[] {
  return itemNames.map((itemName, index) => {
    const position = index + 1;
    const retailPrice = startPrice + index * 120;
    const wholesalePrice = Math.round(retailPrice * 0.88);

    return {
      name: itemName,
      description: `${itemName} - categoria ${categoryName}`,
      stock: 80 + (index % 12) * 15,
      retailPrice,
      wholesalePrice,
    };
  });
}

function createProductSeeds(): ProductSeed[] {
  const verduras = [
    "Acelga",
    "Aji morron rojo",
    "Aji morron verde",
    "Apio",
    "Berenjena",
    "Brocoli",
    "Calabaza anco",
    "Calabaza cabutia",
    "Cebolla blanca",
    "Cebolla morada",
    "Cebolla de verdeo",
    "Coliflor",
    "Espinaca",
    "Lechuga criolla",
    "Lechuga mantecosa",
    "Lechuga morada",
    "Papa negra",
    "Papa blanca",
    "Pepino",
    "Puerro",
    "Rabanito",
    "Remolacha",
    "Repollo blanco",
    "Repollo morado",
    "Tomate perita",
    "Tomate redondo",
    "Zanahoria",
    "Zucchini verde",
    "Zucchini amarillo",
    "Zapallito redondo",
  ];

  const frutas = [
    "Anana",
    "Banana ecuatoriana",
    "Ciruela",
    "Durazno",
    "Frambuesa",
    "Frutilla",
    "Granada",
    "Kiwi",
    "Limon",
    "Mandarina",
    "Mango",
    "Manzana roja",
    "Manzana verde",
    "Melon",
    "Naranja ombligo",
    "Pera williams",
    "Pomelo rosado",
    "Sandia",
    "Uva blanca",
    "Uva negra",
    "Arandano",
    "Palta hass",
    "Cereza",
    "Higo",
    "Membrillo",
  ];

  const hierbas = [
    "Albahaca",
    "Cedron",
    "Ciboulette",
    "Cilantro",
    "Eneldo",
    "Estragon",
    "Hierbabuena",
    "Laurel",
    "Menta",
    "Oregano fresco",
    "Perejil",
    "Romero",
    "Salvia",
    "Tomillo",
    "Lemongrass",
  ];

  const legumbres = [
    "Arveja seca",
    "Lenteja clasica",
    "Lenteja turca",
    "Poroto alubia",
    "Poroto negro",
    "Poroto colorado",
    "Garbanzo chico",
    "Garbanzo grande",
    "Soja amarilla",
    "Haba seca",
    "Mungo",
    "Azuki",
    "Poroto pallares",
    "Arveja partida",
    "Poroto canario",
  ];

  const cereales = [
    "Arroz integral",
    "Arroz yamanI",
    "Arroz largo fino",
    "Avena arrollada",
    "Avena instantanea",
    "Cebada perlada",
    "Centeno en grano",
    "Maiz pisingallo",
    "Maiz blanco",
    "Mijo",
    "Quinoa blanca",
    "Quinoa roja",
    "Trigo burgol",
    "Trigo candeal",
    "Amaranto",
  ];

  const all = [
    ...buildProductsForCategory("verduras", verduras, 900),
    ...buildProductsForCategory("frutas", frutas, 1200),
    ...buildProductsForCategory("hierbas", hierbas, 700),
    ...buildProductsForCategory("legumbres", legumbres, 1500),
    ...buildProductsForCategory("cereales", cereales, 1300),
  ];

  return all.slice(0, TARGET_PRODUCTS);
}

async function ensureRole(
  api: ApiClient,
  name: string,
  permissions: Record<string, unknown>[],
): Promise<Role> {
  const existing = getCollectionItems(await api.roles.getAll());
  const found = existing.find((role) => role.name === name);
  if (found) return found;

  return api.roles.create({ name, permissions });
}

async function ensurePriceList(
  api: ApiClient,
  name: string,
): Promise<PriceList> {
  const existing = getCollectionItems(
    await api.priceLists.getAll(ALL_ITEMS_QUERY),
  );
  const found = existing.find((priceList) => priceList.name === name);
  if (found) return found;

  return api.priceLists.create({ name });
}

async function ensureSupplier(
  api: ApiClient,
  name: string,
  contactInfo: string,
): Promise<Supplier> {
  const existing = getCollectionItems(
    await api.suppliers.getAll(ALL_ITEMS_QUERY),
  );
  const found = existing.find((supplier) => supplier.name === name);
  if (found) return found;

  return api.suppliers.create({
    name,
    email: contactInfo,
  });
}

async function ensureProduct(
  api: ApiClient,
  input: {
    name: string;
    supplierId: string;
    stock: number;
    description?: string;
  },
): Promise<Product> {
  const existing = getCollectionItems(
    await api.products.getAll(ALL_ITEMS_QUERY),
  );
  const found = existing.find((product) => product.name === input.name);
  if (found) return found;

  return api.products.create({
    name: input.name,
    supplier_id: input.supplierId,
    stock: input.stock,
    unit: "pz",
    description: input.description ?? null,
    images: [],
  });
}

async function ensureProductPrice(
  api: ApiClient,
  input: { productId: string; priceListId: string; price: number },
): Promise<ProductPrice> {
  const existing = getCollectionItems(await api.productPrices.getAll());
  const found = existing.find(
    (productPrice) =>
      productPrice.product_id === input.productId &&
      productPrice.price_list_id === input.priceListId,
  );

  if (found) return found;

  return api.productPrices.create({
    product_id: input.productId,
    price_list_id: input.priceListId,
    price: input.price,
  });
}

async function ensureClient(
  api: ApiClient,
  input: {
    name: string;
    phoneNumber: string;
    email: string;
    priceListId: string;
  },
): Promise<Client> {
  const existing = getCollectionItems(
    await api.clients.getAll(ALL_ITEMS_QUERY),
  );
  const found = existing.find(
    (client) => client.phone_number === input.phoneNumber,
  );
  if (found) return found;

  return api.clients.create({
    name: input.name,
    phone_number: input.phoneNumber,
    email: input.email,
    price_list_id: input.priceListId,
  });
}

async function ensureUser(
  api: ApiClient,
  input: { name: string; email: string; password: string; roleId: string },
): Promise<User> {
  const existing = getCollectionItems(
    await api.users.getAll(ALL_ITEMS_QUERY),
  );
  const found = existing.find((user) => user.email === input.email);
  if (found) return found;

  return api.users.create({
    name: input.name,
    email: input.email,
    password: input.password,
    role_id: input.roleId,
  });
}

async function run(): Promise<void> {
  const baseUrl = normalizeBaseUrl(
    process.env.SEED_API_BASE_URL ?? "http://localhost:3000",
  );
  const token = process.env.SEED_API_BEARER_TOKEN;

  const api = createApiClient({
    request: createFetchTransport({ baseUrl, token }),
  });

  console.log(`[seed] Target API: ${baseUrl}`);

  logStep("Creando roles");
  const adminRole = await ensureRole(api, "admin", [
    { action: "manage", resource: "*" },
  ]);

  logStep("Creando listas de precio");
  const minorista = await ensurePriceList(api, "Lista Minorista");
  const mayorista = await ensurePriceList(api, "Lista Mayorista");

  logStep(`Asegurando ${TARGET_SUPPLIERS} proveedores`);
  const supplierSeeds = createSupplierSeeds(TARGET_SUPPLIERS);
  for (const supplierSeed of supplierSeeds) {
    await ensureSupplier(api, supplierSeed.name, supplierSeed.contactInfo);
  }
  const suppliers = getCollectionItems(
    await api.suppliers.getAll(ALL_ITEMS_QUERY),
  );
  const targetSuppliers = supplierSeeds
    .map((seed) => suppliers.find((supplier) => supplier.name === seed.name))
    .filter((supplier): supplier is Supplier => supplier !== undefined);

  if (targetSuppliers.length === 0) {
    throw new Error(
      "No se pudieron asegurar proveedores para asignar productos",
    );
  }

  logStep(`Asegurando ${TARGET_PRODUCTS} productos de multiples categorias`);
  const productSeeds = createProductSeeds();
  for (let index = 0; index < productSeeds.length; index += 1) {
    const productSeed = productSeeds[index];
    const supplier = targetSuppliers[index % targetSuppliers.length];

    await ensureProduct(api, {
      name: productSeed.name,
      supplierId: supplier.id,
      stock: productSeed.stock,
      description: productSeed.description,
    });
  }

  const products = getCollectionItems(
    await api.products.getAll(ALL_ITEMS_QUERY),
  );
  const targetProducts = productSeeds
    .map((seed) => products.find((product) => product.name === seed.name))
    .filter((product): product is Product => product !== undefined);

  if (targetProducts.length === 0) {
    throw new Error(
      "No se pudieron asegurar productos para generar precios y pedidos",
    );
  }

  logStep("Asegurando precios para lista minorista y mayorista");
  for (const productSeed of productSeeds) {
    const product = targetProducts.find(
      (existingProduct) => existingProduct.name === productSeed.name,
    );

    if (!product) {
      continue;
    }

    await ensureProductPrice(api, {
      productId: product.id,
      priceListId: minorista.id,
      price: productSeed.retailPrice,
    });

    await ensureProductPrice(api, {
      productId: product.id,
      priceListId: mayorista.id,
      price: productSeed.wholesalePrice,
    });
  }

  const productPrices = getCollectionItems(await api.productPrices.getAll());

  logStep(`Asegurando ${TARGET_CLIENTS} clientes`);
  const clientSeeds = createClientSeeds(TARGET_CLIENTS);
  for (let index = 0; index < clientSeeds.length; index += 1) {
    const clientSeed = clientSeeds[index];
    const priceListId = index % 2 === 0 ? mayorista.id : minorista.id;
    await ensureClient(api, {
      name: clientSeed.name,
      phoneNumber: clientSeed.phoneNumber,
      email: clientSeed.email,
      priceListId,
    });
  }

  const clients = getCollectionItems(
    await api.clients.getAll(ALL_ITEMS_QUERY),
  );
  const targetClients = clientSeeds
    .map((seed) =>
      clients.find((client) => client.phone_number === seed.phoneNumber),
    )
    .filter((client): client is Client => client !== undefined);

  if (targetClients.length === 0) {
    throw new Error("No se pudieron asegurar clientes para generar pedidos");
  }

  logStep("Asegurando 1 usuario admin");
  const adminUser = await ensureUser(api, {
    name: "Administrador VegyFresh",
    email: "admin@vegyfresh.local",
    password: "seed_admin_password_change_me",
    roleId: adminRole.id,
  });

  logStep(`Asegurando al menos ${TARGET_ORDERS} pedidos`);
  const existingOrders = getCollectionItems(
    await api.orders.getAll(ALL_ORDERS_QUERY),
  );
  const missingOrders = Math.max(0, TARGET_ORDERS - existingOrders.length);

  for (let index = 0; index < missingOrders; index += 1) {
    const client = targetClients[index % targetClients.length];
    const product = targetProducts[(index * 3) % targetProducts.length];

    const unitPrice =
      productPrices.find(
        (value) =>
          value.product_id === product.id &&
          value.price_list_id === mayorista.id,
      )?.price ?? 1000;

    await api.orders.create({
      client_id: client.id,
      user_id: adminUser.id,
      origin: "MANUAL",
      status: "PENDING_REVIEW",
      items: [
        {
          product_id: product.id,
          quantity: (index % 5) + 1,
          unit_price: unitPrice,
        },
      ],
    });
  }

  const orders = getCollectionItems(
    await api.orders.getAll(ALL_ORDERS_QUERY),
  );

  console.log("\n[seed] Seed completado con exito");
  console.log("[seed] Resumen final:");
  console.log(`- role admin: ${adminRole.id}`);
  console.log(`- listas de precio: 2 (${minorista.name}, ${mayorista.name})`);
  console.log(`- proveedores objetivo: ${TARGET_SUPPLIERS}`);
  console.log(`- productos objetivo: ${TARGET_PRODUCTS}`);
  console.log(`- clientes objetivo: ${TARGET_CLIENTS}`);
  console.log(`- pedidos totales actuales: ${orders.length}`);
  console.log(`- usuario admin: ${adminUser.email}`);
}

run().catch((error: unknown) => {
  console.error("\n[seed] Error ejecutando seed");
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
