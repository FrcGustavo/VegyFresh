type Role = {
  id: string;
  name: string;
};

type PriceList = {
  id: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
};

type ProductPrice = {
  id: string;
  product_id: string;
  price_list_id: string;
  price: number;
};

type Client = {
  id: string;
  phone_number: string;
  name: string;
};

type User = {
  id: string;
  email: string;
  name: string;
};

type Order = {
  id: string;
};

type ProductSeed = {
  sku: string;
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

type HttpMethod = 'GET' | 'POST';

class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken?: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    const parsed = raw.length > 0 ? tryParseJson(raw) : undefined;

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} on ${method} ${path}\n${raw}`,
      );
    }

    return parsed as T;
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function logStep(step: string): void {
  console.log(`\n[seed] ${step}`);
}

const TARGET_SUPPLIERS = 25;
const TARGET_PRODUCTS = 100;
const TARGET_CLIENTS = 20;
const TARGET_ORDERS = 50;

function pad(value: number): string {
  return value.toString().padStart(3, '0');
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
      phoneNumber: `+54911000${number.toString().padStart(4, '0')}`,
      email: `cliente${number}@vegyfresh.local`,
    };
  });
}

function buildProductsForCategory(
  categoryCode: string,
  categoryName: string,
  itemNames: string[],
  startPrice: number,
): ProductSeed[] {
  return itemNames.map((itemName, index) => {
    const position = index + 1;
    const retailPrice = startPrice + index * 120;
    const wholesalePrice = Math.round(retailPrice * 0.88);

    return {
      sku: `${categoryCode}-${pad(position)}`,
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
    'Acelga',
    'Aji morron rojo',
    'Aji morron verde',
    'Apio',
    'Berenjena',
    'Brocoli',
    'Calabaza anco',
    'Calabaza cabutia',
    'Cebolla blanca',
    'Cebolla morada',
    'Cebolla de verdeo',
    'Coliflor',
    'Espinaca',
    'Lechuga criolla',
    'Lechuga mantecosa',
    'Lechuga morada',
    'Papa negra',
    'Papa blanca',
    'Pepino',
    'Puerro',
    'Rabanito',
    'Remolacha',
    'Repollo blanco',
    'Repollo morado',
    'Tomate perita',
    'Tomate redondo',
    'Zanahoria',
    'Zucchini verde',
    'Zucchini amarillo',
    'Zapallito redondo',
  ];

  const frutas = [
    'Anana',
    'Banana ecuatoriana',
    'Ciruela',
    'Durazno',
    'Frambuesa',
    'Frutilla',
    'Granada',
    'Kiwi',
    'Limon',
    'Mandarina',
    'Mango',
    'Manzana roja',
    'Manzana verde',
    'Melon',
    'Naranja ombligo',
    'Pera williams',
    'Pomelo rosado',
    'Sandia',
    'Uva blanca',
    'Uva negra',
    'Arandano',
    'Palta hass',
    'Cereza',
    'Higo',
    'Membrillo',
  ];

  const hierbas = [
    'Albahaca',
    'Cedron',
    'Ciboulette',
    'Cilantro',
    'Eneldo',
    'Estragon',
    'Hierbabuena',
    'Laurel',
    'Menta',
    'Oregano fresco',
    'Perejil',
    'Romero',
    'Salvia',
    'Tomillo',
    'Lemongrass',
  ];

  const legumbres = [
    'Arveja seca',
    'Lenteja clasica',
    'Lenteja turca',
    'Poroto alubia',
    'Poroto negro',
    'Poroto colorado',
    'Garbanzo chico',
    'Garbanzo grande',
    'Soja amarilla',
    'Haba seca',
    'Mungo',
    'Azuki',
    'Poroto pallares',
    'Arveja partida',
    'Poroto canario',
  ];

  const cereales = [
    'Arroz integral',
    'Arroz yamanI',
    'Arroz largo fino',
    'Avena arrollada',
    'Avena instantanea',
    'Cebada perlada',
    'Centeno en grano',
    'Maiz pisingallo',
    'Maiz blanco',
    'Mijo',
    'Quinoa blanca',
    'Quinoa roja',
    'Trigo burgol',
    'Trigo candeal',
    'Amaranto',
  ];

  const all = [
    ...buildProductsForCategory('VER', 'verduras', verduras, 900),
    ...buildProductsForCategory('FRU', 'frutas', frutas, 1200),
    ...buildProductsForCategory('HER', 'hierbas', hierbas, 700),
    ...buildProductsForCategory('LEG', 'legumbres', legumbres, 1500),
    ...buildProductsForCategory('CER', 'cereales', cereales, 1300),
  ];

  return all.slice(0, TARGET_PRODUCTS);
}

async function ensureRole(api: ApiClient, name: string, permissions: Record<string, unknown>[]): Promise<Role> {
  const existing = await api.get<Role[]>('/roles');
  const found = existing.find((role) => role.name === name);
  if (found) return found;

  return api.post<Role>('/roles', { name, permissions });
}

async function ensurePriceList(api: ApiClient, name: string): Promise<PriceList> {
  const existing = await api.get<PriceList[]>('/price-lists');
  const found = existing.find((priceList) => priceList.name === name);
  if (found) return found;

  return api.post<PriceList>('/price-lists', { name });
}

async function ensureSupplier(api: ApiClient, name: string, contactInfo: string): Promise<Supplier> {
  const existing = await api.get<Supplier[]>('/suppliers');
  const found = existing.find((supplier) => supplier.name === name);
  if (found) return found;

  return api.post<Supplier>('/suppliers', {
    name,
    contact_info: contactInfo,
  });
}

async function ensureProduct(
  api: ApiClient,
  input: { sku: string; name: string; supplierId: string; stock: number; description?: string },
): Promise<Product> {
  const existing = await api.get<Product[]>('/products');
  const found = existing.find((product) => product.sku === input.sku);
  if (found) return found;

  return api.post<Product>('/products', {
    sku: input.sku,
    name: input.name,
    supplier_id: input.supplierId,
    stock: input.stock,
    description: input.description ?? null,
    images: [],
  });
}

async function ensureProductPrice(
  api: ApiClient,
  input: { productId: string; priceListId: string; price: number },
): Promise<ProductPrice> {
  const existing = await api.get<ProductPrice[]>('/product-prices');
  const found = existing.find(
    (productPrice) =>
      productPrice.product_id === input.productId &&
      productPrice.price_list_id === input.priceListId,
  );

  if (found) return found;

  return api.post<ProductPrice>('/product-prices', {
    product_id: input.productId,
    price_list_id: input.priceListId,
    price: input.price,
  });
}

async function ensureClient(
  api: ApiClient,
  input: { name: string; phoneNumber: string; email: string; priceListId: string },
): Promise<Client> {
  const existing = await api.get<Client[]>('/clients');
  const found = existing.find((client) => client.phone_number === input.phoneNumber);
  if (found) return found;

  return api.post<Client>('/clients', {
    name: input.name,
    phone_number: input.phoneNumber,
    email: input.email,
    price_list_id: input.priceListId,
  });
}

async function ensureUser(
  api: ApiClient,
  input: { name: string; email: string; passwordHash: string; roleId: string },
): Promise<User> {
  const existing = await api.get<User[]>('/users');
  const found = existing.find((user) => user.email === input.email);
  if (found) return found;

  return api.post<User>('/users', {
    name: input.name,
    email: input.email,
    password_hash: input.passwordHash,
    role_id: input.roleId,
  });
}

async function run(): Promise<void> {
  const baseUrl = normalizeBaseUrl(
    process.env.SEED_API_BASE_URL ?? 'http://localhost:3000',
  );
  const token = process.env.SEED_API_BEARER_TOKEN;

  const api = new ApiClient(baseUrl, token);

  console.log(`[seed] Target API: ${baseUrl}`);

  logStep('Creando roles');
  const adminRole = await ensureRole(api, 'admin', [
    { action: 'manage', resource: '*' },
  ]);

  logStep('Creando listas de precio');
  const minorista = await ensurePriceList(api, 'Lista Minorista');
  const mayorista = await ensurePriceList(api, 'Lista Mayorista');

  logStep(`Asegurando ${TARGET_SUPPLIERS} proveedores`);
  const supplierSeeds = createSupplierSeeds(TARGET_SUPPLIERS);
  for (const supplierSeed of supplierSeeds) {
    await ensureSupplier(api, supplierSeed.name, supplierSeed.contactInfo);
  }
  const suppliers = await api.get<Supplier[]>('/suppliers');
  const targetSuppliers = supplierSeeds
    .map((seed) => suppliers.find((supplier) => supplier.name === seed.name))
    .filter((supplier): supplier is Supplier => supplier !== undefined);

  if (targetSuppliers.length === 0) {
    throw new Error('No se pudieron asegurar proveedores para asignar productos');
  }

  logStep(`Asegurando ${TARGET_PRODUCTS} productos de multiples categorias`);
  const productSeeds = createProductSeeds();
  for (let index = 0; index < productSeeds.length; index += 1) {
    const productSeed = productSeeds[index];
    const supplier = targetSuppliers[index % targetSuppliers.length];

    await ensureProduct(api, {
      sku: productSeed.sku,
      name: productSeed.name,
      supplierId: supplier.id,
      stock: productSeed.stock,
      description: productSeed.description,
    });
  }

  const products = await api.get<Product[]>('/products');
  const targetProducts = productSeeds
    .map((seed) => products.find((product) => product.sku === seed.sku))
    .filter((product): product is Product => product !== undefined);

  if (targetProducts.length === 0) {
    throw new Error('No se pudieron asegurar productos para generar precios y pedidos');
  }

  logStep('Asegurando precios para lista minorista y mayorista');
  for (const productSeed of productSeeds) {
    const product = targetProducts.find(
      (existingProduct) => existingProduct.sku === productSeed.sku,
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

  const productPrices = await api.get<ProductPrice[]>('/product-prices');

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

  const clients = await api.get<Client[]>('/clients');
  const targetClients = clientSeeds
    .map((seed) =>
      clients.find((client) => client.phone_number === seed.phoneNumber),
    )
    .filter((client): client is Client => client !== undefined);

  if (targetClients.length === 0) {
    throw new Error('No se pudieron asegurar clientes para generar pedidos');
  }

  logStep('Asegurando 1 usuario admin');
  const adminUser = await ensureUser(api, {
    name: 'Administrador VegyFresh',
    email: 'admin@vegyfresh.local',
    passwordHash: 'seed_admin_password_hash_change_me',
    roleId: adminRole.id,
  });

  logStep(`Asegurando al menos ${TARGET_ORDERS} pedidos`);
  const existingOrders = await api.get<Order[]>('/orders');
  const missingOrders = Math.max(0, TARGET_ORDERS - existingOrders.length);

  for (let index = 0; index < missingOrders; index += 1) {
    const client = targetClients[index % targetClients.length];
    const product = targetProducts[(index * 3) % targetProducts.length];

    const unitPrice =
      productPrices.find(
        (value) =>
          value.product_id === product.id && value.price_list_id === mayorista.id,
      )?.price ?? 1000;

    await api.post<Order>('/orders', {
      client_id: client.id,
      user_id: adminUser.id,
      origin: 'MANUAL',
      status: 'PENDING_REVIEW',
      items: [
        {
          product_id: product.id,
          quantity: (index % 5) + 1,
          unit_price: unitPrice,
        },
      ],
    });
  }

  const orders = await api.get<Order[]>('/orders');

  console.log('\n[seed] Seed completado con exito');
  console.log('[seed] Resumen final:');
  console.log(`- role admin: ${adminRole.id}`);
  console.log(`- listas de precio: 2 (${minorista.name}, ${mayorista.name})`);
  console.log(`- proveedores objetivo: ${TARGET_SUPPLIERS}`);
  console.log(`- productos objetivo: ${TARGET_PRODUCTS}`);
  console.log(`- clientes objetivo: ${TARGET_CLIENTS}`);
  console.log(`- pedidos totales actuales: ${orders.length}`);
  console.log(`- usuario admin: ${adminUser.email}`);
}

run().catch((error: unknown) => {
  console.error('\n[seed] Error ejecutando seed');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
