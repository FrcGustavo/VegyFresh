export type OrderChangeEvent = { target: { name: string; value: string } };

export interface OrderFormData {
  client_id: string;
  user_id: string;
  status: string;
  origin: string;
  delivery_date: string;
  order_folio: string;
  created_at: string;
}

export interface OrderFormItem {
  id?: string | number;
  clientRowId: string;
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
  folio: string;
  name: string;
  unit: string;
}

export interface OrderFormProps {
  formData: OrderFormData;
  items: OrderFormItem[];
  clientLookup: { folio: string; name: string };
  totalGeneral: number;
  handleChange: (e: OrderChangeEvent) => void;
  updateClientLookup: (field: "folio" | "name", value: string) => void;
  addItemField: () => void;
  removeItemField: (index: number) => void;
  updateItemField: (
    index: number,
    field: string,
    value: string | number | null,
  ) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  isDisabled?: boolean;
}
