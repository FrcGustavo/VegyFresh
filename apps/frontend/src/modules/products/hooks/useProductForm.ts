import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  priceListsQueryOptions,
  productsMutationOptions,
  productsQueryOptions,
  suppliersQueryOptions,
} from "../../../api";
import { createClientRowId } from "../../../utils/clientRowId";

type SaveAction = "save" | "save-and-close" | "save-and-new";
type ProductChangeEvent = { target: { name: string; value: string } };
interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  stock: number;
  supplier_id: string;
  unit: "kg" | "pz";
}
interface ProductPrice {
  id?: string | number;
  clientRowId: string;
  price_list_id: string;
  price: number | string;
}
interface ExistingProductPrice {
  id?: string | number;
  price_list_id: string;
  price: number;
}
interface SupplierOption {
  id: string;
  name: string;
}
interface PriceListOption {
  id: string;
  name: string;
}
const EMPTY_PRODUCT_FORM: ProductFormData = {
  sku: "",
  name: "",
  description: "",
  stock: 0,
  supplier_id: "",
  unit: "pz",
};

const createEmptyPrice = (): ProductPrice => ({
  clientRowId: createClientRowId(),
  price_list_id: "",
  price: "",
});

export function useProductForm(
  id?: string,
  onSuccess?: (action: SaveAction) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    ...productsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingProduct) {
      queueMicrotask(() => {
        setFormData({
          sku: existingProduct.sku,
          name: existingProduct.name,
          description: existingProduct.description || "",
          stock: existingProduct.stock,
          supplier_id: existingProduct.supplier_id,
          unit: existingProduct.unit,
        });
      });
      if (existingProduct.productPrices) {
        const productPrices = existingProduct.productPrices;
        queueMicrotask(() => {
          setPrices(
            productPrices.map((p: ExistingProductPrice) => ({
              id: p.id,
              clientRowId: String(p.id ?? createClientRowId()),
              price_list_id: p.price_list_id,
              price: p.price,
            })),
          );
        });
      }
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_PRODUCT_FORM);
        setPrices([]);
      });
    }
  }, [id, existingProduct]);

  const { data: suppliersData } = useQuery(suppliersQueryOptions.list());
  const { data: priceListsData } = useQuery(priceListsQueryOptions.list());

  const suppliers = (
    Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []
  ) as SupplierOption[];
  const priceLists = (
    Array.isArray(priceListsData) ? priceListsData : priceListsData?.data || []
  ) as PriceListOption[];

  const handleChange = (e: ProductChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "stock" ? Number(value) : value,
    }));
  };

  const addPriceField = () => {
    setPrices((prevPrices) => [...prevPrices, createEmptyPrice()]);
  };

  const removePriceField = (index: number) => {
    setPrices((prevPrices) => prevPrices.filter((_, i) => i !== index));
  };

  const updatePriceField = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newPrices = [...prices];
    if (field === "price_list_id") {
      newPrices[index].price_list_id = String(value);
    } else if (field === "price") {
      newPrices[index].price = value;
    }
    setPrices(newPrices);
  };

  const createMutation = useMutation(
    productsMutationOptions.create(queryClient),
  );
  const updateMutation = useMutation(
    productsMutationOptions.update(queryClient),
  );

  const handleSubmit = (action: SaveAction = "save") => {
    const payload = { ...formData, prices };
    const options = {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate("/products");
        }
      },
    };

    if (id) {
      updateMutation.mutate({ id, input: payload }, options);
    } else {
      createMutation.mutate(payload, options);
    }
  };

  return {
    formData,
    prices,
    suppliers,
    priceLists,
    isLoading: isLoadingProduct,
    isSaving: createMutation.isPending || updateMutation.isPending,
    handleChange,
    addPriceField,
    removePriceField,
    updatePriceField,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
