export type ProductChangeEvent = { target: { name: string; value: string } };

export interface ProductFormData {
  name: string;
  description: string;
  stock: number | string;
  supplier_id: string;
}

export interface ProductPrice {
  id?: string | number;
  clientRowId: string;
  price_list_id: string;
  price: number | string;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface PriceListOption {
  id: string;
  name: string;
}

export interface ProductFormProps {
  formData: ProductFormData;
  prices: ProductPrice[];
  suppliers: SupplierOption[];
  priceLists: PriceListOption[];
  handleChange: (e: ProductChangeEvent) => void;
  addPriceField: () => void;
  removePriceField: (index: number) => void;
  updatePriceField: (
    index: number,
    field: string,
    value: string | number,
  ) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  title: string;
  isDisabled?: boolean;
}
