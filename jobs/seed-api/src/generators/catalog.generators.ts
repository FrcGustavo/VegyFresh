import { PRICE_LISTS, SEED_PREFIX, TARGETS } from "../domain/constants.js";
import type {
  ClientSeed,
  ProductSeed,
  SupplierSeed,
  UserSeed,
} from "../domain/models.js";
import { pad } from "../utils/format.js";

const productNames = [
  "Acelga",
  "Aguacate",
  "Ajo",
  "Apio",
  "Arándano",
  "Berenjena",
  "Brócoli",
  "Calabaza",
  "Cebolla",
  "Cilantro",
  "Coliflor",
  "Durazno",
  "Espinaca",
  "Fresa",
  "Jengibre",
  "Kiwi",
  "Lechuga",
  "Limón",
  "Mandarina",
  "Mango",
  "Manzana",
  "Melón",
  "Naranja",
  "Papa",
  "Pepino",
  "Pera",
  "Pimiento",
  "Piña",
  "Plátano",
  "Sandía",
  "Tomate",
  "Uva",
  "Zanahoria",
  "Calabacita",
  "Perejil",
  "Romero",
  "Albahaca",
  "Betabel",
  "Chayote",
  "Champiñón",
];

export function createSupplierSeeds(): SupplierSeed[] {
  return Array.from({ length: TARGETS.suppliers }, (_, index) => {
    const number = index + 1;
    return {
      key: `supplier-${pad(number)}`,
      name: `${SEED_PREFIX} Proveedor ${pad(number)}`,
      email: `seed.proveedor.${pad(number)}@vegyfresh.local`,
      phoneNumber: `+525510${number.toString().padStart(6, "0")}`,
    };
  });
}

export function createProductSeeds(): ProductSeed[] {
  return Array.from({ length: TARGETS.products }, (_, index) => {
    const number = index + 1;
    const family = productNames[index % productNames.length];
    const variant = Math.floor(index / productNames.length) + 1;
    return {
      key: `product-${pad(number)}`,
      name: `${SEED_PREFIX} ${family} ${pad(number)}`,
      description: `${family}, variante ${variant}, generado para pruebas`,
      supplierKey: `supplier-${pad((index % TARGETS.suppliers) + 1)}`,
      stock: 20 + (index % 20),
      unit: index % 4 === 0 ? "pz" : "kg",
      basePrice: 18 + (index % 40) * 2.75 + variant,
    };
  });
}

export function createClientSeeds(): ClientSeed[] {
  return Array.from({ length: TARGETS.clients }, (_, index) => {
    const number = index + 1;
    return {
      key: `client-${pad(number)}`,
      name: `${SEED_PREFIX} Cliente ${pad(number)}`,
      phoneNumber: `+525520${number.toString().padStart(6, "0")}`,
      email: `seed.cliente.${pad(number)}@vegyfresh.local`,
      priceListName: PRICE_LISTS[Math.floor(index / 10)].name,
    };
  });
}

export function createUserSeeds(
  adminPassword: string,
  operatorPassword: string,
): UserSeed[] {
  return Array.from({ length: TARGETS.users }, (_, index) => {
    const number = index + 1;
    return {
      key: `user-${pad(number)}`,
      name:
        index === 0
          ? `${SEED_PREFIX} Administrador`
          : `${SEED_PREFIX} Operativo ${pad(index)}`,
      email:
        index === 0
          ? "seed.admin@vegyfresh.local"
          : `seed.operativo.${pad(index)}@vegyfresh.local`,
      roleName: index === 0 ? "admin" : "operativo",
      password: index === 0 ? adminPassword : operatorPassword,
    };
  });
}
