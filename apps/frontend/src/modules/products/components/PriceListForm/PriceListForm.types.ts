export interface PriceListProductItem {
  clientRowId: string;
  product_id: string;
  name?: string;
  price: number | string;
  id?: string;
}

export interface PriceListFormProps {
  name: string;
  setName: (name: string) => void;
  productsList: PriceListProductItem[];
  addProductField: () => void;
  updateProductField: (
    index: number,
    field: string,
    value: string | number,
  ) => void;
  removeProductField: (index: number) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  isDisabled?: boolean;
}
