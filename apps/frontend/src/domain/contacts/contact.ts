export interface Client {
  id: string;
  folio: string;
  name: string;
  phone_number: string;
  email: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  suburb: string | null;
  external_number: string | null;
  internal_number: string | null;
  avatar_url: string | null;
  price_list_id: string | null;
  organization_id: string;
}

export interface Supplier {
  id: string;
  folio: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  logo_url: string | null;
  organization_id: string;
  createdAt: string;
  updatedAt: string;
}
