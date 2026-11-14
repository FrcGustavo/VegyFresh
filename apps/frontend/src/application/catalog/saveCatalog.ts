export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role_id: string;
  avatar_url: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  stock: number | string;
  supplier_id: string;
  unit: "kg" | "pz";
  images: string[];
}

export interface ProductPriceRow {
  id?: string;
  clientRowId: string;
  price_list_id: string;
  price: number | string;
}

type UserInput = {
  name: string;
  email: string;
  role_id: string;
  avatar_url: string | null;
};
type ProductPrice = { price_list_id: string; price: number };
type ProductSave = {
  id?: string;
  product: {
    name: string;
    description: string | null;
    supplier_id: string;
    stock: number;
    unit: "kg" | "pz";
    images: string[];
  };
  prices: ProductPrice[];
  existingPrices: Array<ProductPrice & { id: string }>;
};

export function saveUser<Result>(
  form: UserFormData,
  id: string | undefined,
  port: {
    create: (input: UserInput & { password: string }) => Promise<Result>;
    update: (
      id: string,
      input: UserInput & { password?: string },
    ) => Promise<Result>;
  },
) {
  if (!form.name.trim() || !form.email.trim() || !form.role_id)
    throw new Error("Completa el nombre, email y rol del usuario.");
  if (!id && form.password.length < 12)
    throw new Error("La contraseña debe tener al menos 12 caracteres.");
  const input = {
    name: form.name.trim(),
    email: form.email.trim(),
    role_id: form.role_id,
    avatar_url: form.avatar_url.trim() || null,
  };
  return id
    ? port.update(id, {
        ...input,
        ...(form.password ? { password: form.password } : {}),
      })
    : port.create({ ...input, password: form.password });
}

export function saveProduct<Result>(
  form: ProductFormData,
  prices: ProductPriceRow[],
  existingPrices: ProductSave["existingPrices"],
  id: string | undefined,
  port: { save: (input: ProductSave) => Promise<Result> },
) {
  if (!form.name.trim() || !form.supplier_id)
    throw new Error("Completa el nombre y el proveedor.");
  const stock = Number(form.stock);
  if (!Number.isFinite(stock) || stock < 0)
    throw new Error("El stock debe ser un número igual o mayor que cero.");
  if (
    prices.some(
      (item) =>
        !item.price_list_id ||
        item.price === "" ||
        !Number.isFinite(Number(item.price)),
    )
  )
    throw new Error("Completa la lista y el importe de cada precio.");
  const selectedLists = prices.map((item) => item.price_list_id);
  if (new Set(selectedLists).size !== selectedLists.length)
    throw new Error("Cada lista de precios solo puede asignarse una vez.");
  return port.save({
    id,
    product: {
      name: form.name.trim(),
      description: form.description.trim() || null,
      supplier_id: form.supplier_id,
      stock,
      unit: form.unit,
      images: form.images.map((image) => image.trim()).filter(Boolean),
    },
    prices: prices.map((item) => ({
      price_list_id: item.price_list_id,
      price: Number(item.price),
    })),
    existingPrices,
  });
}
