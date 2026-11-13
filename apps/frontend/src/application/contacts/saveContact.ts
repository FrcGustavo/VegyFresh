export interface ClientFormData {
  name: string;
  phone_number: string;
  email: string;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  address: string;
  suburb: string;
  external_number: string;
  internal_number: string;
  avatar_url: string;
  price_list_id: string;
}

export interface SupplierFormData {
  name: string;
  email: string;
  phone_number: string;
  logo_url: string;
}

type SavePort<Input, Result> = {
  create: (input: Input) => Promise<Result>;
  update: (id: string, input: Input) => Promise<Result>;
};

const nullable = (value: string) => value.trim() || null;

export function saveClient<Result>(
  form: ClientFormData,
  id: string | undefined,
  port: SavePort<{ name: string; phone_number: string } & Record<Exclude<keyof ClientFormData, "name" | "phone_number">, string | null>, Result>,
) {
  if (!form.name.trim() || !form.phone_number.trim()) {
    throw new Error("Completa el nombre y el teléfono del cliente.");
  }
  const input = {
    name: form.name.trim(),
    phone_number: form.phone_number.trim(),
    email: nullable(form.email),
    country: nullable(form.country),
    state: nullable(form.state),
    city: nullable(form.city),
    postal_code: nullable(form.postal_code),
    address: nullable(form.address),
    suburb: nullable(form.suburb),
    external_number: nullable(form.external_number),
    internal_number: nullable(form.internal_number),
    avatar_url: nullable(form.avatar_url),
    price_list_id: nullable(form.price_list_id),
  };
  return id ? port.update(id, input) : port.create(input);
}

export function saveSupplier<Result>(
  form: SupplierFormData,
  id: string | undefined,
  port: SavePort<{ name: string; email: string | null; phone_number: string | null; logo_url: string | null }, Result>,
) {
  if (!form.name.trim()) throw new Error("Completa el nombre del proveedor.");
  const input = {
    name: form.name.trim(),
    email: nullable(form.email),
    phone_number: nullable(form.phone_number),
    logo_url: nullable(form.logo_url),
  };
  return id ? port.update(id, input) : port.create(input);
}
