import type {
  CreateProductInput,
  PriceList,
  Product,
  ProductPrice,
} from "./types.js";

export interface ProductPriceDraft {
  price_list_id: string;
  price: number;
}

export interface ExistingProductPrice extends ProductPriceDraft {
  id: string;
}

export interface PriceListProductDraft {
  product_id: string;
  price: number;
}

type WorkflowResources = {
  products: {
    create(input: CreateProductInput): Promise<Product>;
    update(id: string, input: CreateProductInput): Promise<Product>;
    get(id: string): Promise<Product>;
  };
  priceLists: {
    create(input: { name: string }): Promise<PriceList>;
    update(id: string, input: { name: string }): Promise<PriceList>;
    get(id: string): Promise<PriceList>;
  };
  productPrices: {
    create(input: {
      product_id: string;
      price_list_id: string;
      price: number;
    }): Promise<ProductPrice>;
    update(id: string, input: { price: number }): Promise<ProductPrice>;
    remove(id: string): Promise<void>;
  };
};

async function syncProductPrices(
  resources: WorkflowResources,
  productId: string,
  desired: ProductPriceDraft[],
  existing: Array<Pick<ProductPrice, "id" | "price_list_id" | "price">>,
) {
  const existingByList = new Map(
    existing.map((item) => [item.price_list_id, item]),
  );
  const desiredLists = new Set(desired.map((item) => item.price_list_id));

  await Promise.all(
    existing
      .filter((item) => !desiredLists.has(item.price_list_id))
      .map((item) => resources.productPrices.remove(item.id)),
  );

  await Promise.all(
    desired.map((item) => {
      const current = existingByList.get(item.price_list_id);
      if (current) {
        return Number(current.price) === item.price
          ? Promise.resolve(current)
          : resources.productPrices.update(current.id, { price: item.price });
      }
      return resources.productPrices.create({ product_id: productId, ...item });
    }),
  );
}

async function syncPriceListProducts(
  resources: WorkflowResources,
  priceListId: string,
  desired: PriceListProductDraft[],
  existing: Array<Pick<ProductPrice, "id" | "product_id" | "price">>,
) {
  const existingByProduct = new Map(
    existing.map((item) => [item.product_id, item]),
  );
  const desiredProducts = new Set(desired.map((item) => item.product_id));

  await Promise.all(
    existing
      .filter((item) => !desiredProducts.has(item.product_id))
      .map((item) => resources.productPrices.remove(item.id)),
  );

  await Promise.all(
    desired.map((item) => {
      const current = existingByProduct.get(item.product_id);
      if (current) {
        return Number(current.price) === item.price
          ? Promise.resolve(current)
          : resources.productPrices.update(current.id, { price: item.price });
      }
      return resources.productPrices.create({
        product_id: item.product_id,
        price_list_id: priceListId,
        price: item.price,
      });
    }),
  );
}

export function createWorkflows(resources: WorkflowResources) {
  return {
    saveProductWithPrices: async ({
      id,
      product,
      prices,
      existingPrices,
    }: {
      id?: string;
      product: CreateProductInput;
      prices: ProductPriceDraft[];
      existingPrices?: ExistingProductPrice[];
    }) => {
      const current = id && !existingPrices
        ? await resources.products.get(id)
        : undefined;
      const saved = id
        ? await resources.products.update(id, product)
        : await resources.products.create(product);

      await syncProductPrices(
        resources,
        saved.id,
        prices,
        existingPrices ?? current?.productPrices ?? [],
      );
      return saved;
    },

    savePriceListWithProducts: async ({ id, name, products }: {
      id?: string;
      name: string;
      products: PriceListProductDraft[];
    }) => {
      const current = id ? await resources.priceLists.get(id) : undefined;
      const saved = id
        ? await resources.priceLists.update(id, { name })
        : await resources.priceLists.create({ name });

      await syncPriceListProducts(
        resources,
        saved.id,
        products,
        current?.productPrices ?? [],
      );
      return saved;
    },
  };
}
