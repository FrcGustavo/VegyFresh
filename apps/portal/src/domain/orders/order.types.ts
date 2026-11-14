export type PortalOrderItem = {
  id: string;
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  product?: {
    id: string;
    folio: string;
    name: string;
    unit: string;
  };
};

export type PortalOrder = {
  id: string;
  folio: string;
  status: string;
  origin: string;
  description: string | null;
  delivery_date: string | null;
  created_at: string;
  total_amount: number | string;
  items: PortalOrderItem[];
};
