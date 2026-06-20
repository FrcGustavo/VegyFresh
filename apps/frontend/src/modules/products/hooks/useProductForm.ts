import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  priceListsQueryOptions,
  productEditorMutationOptions,
  productsQueryOptions,
  suppliersQueryOptions,
  type Product,
} from "../../../api";
import { createClientRowId } from "../../../utils/clientRowId";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type ProductChangeEvent = { target: { name: string; value: string } };

interface ProductFormData {
  name: string;
  description: string;
  stock: number | string;
  supplier_id: string;
  unit: "kg" | "pz";
  images: string[];
}

interface ProductPriceRow {
  id?: string;
  clientRowId: string;
  price_list_id: string;
  price: number | string;
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
  name: "",
  description: "",
  stock: 0,
  supplier_id: "",
  unit: "pz",
  images: [],
};

const createEmptyPrice = (): ProductPriceRow => ({
  clientRowId: createClientRowId(),
  price_list_id: "",
  price: "",
});

export function useProductForm(
  id?: string,
  onSuccess?: (action: SaveAction, product: Product) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [prices, setPrices] = useState<ProductPriceRow[]>([]);
  const [originalPrices, setOriginalPrices] = useState<
    Array<{ id: string; price_list_id: string; price: number }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    ...productsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingProduct) {
      const loadedPrices = (existingProduct.productPrices ?? []).map((item) => ({
        id: item.id,
        price_list_id: item.price_list_id,
        price: Number(item.price),
      }));

      queueMicrotask(() => {
        setFormData({
          name: existingProduct.name,
          description: existingProduct.description ?? "",
          stock: Number(existingProduct.stock),
          supplier_id: existingProduct.supplier_id,
          unit: existingProduct.unit,
          images: existingProduct.images ?? [],
        });
        setPrices(
          loadedPrices.map((item) => ({
            ...item,
            clientRowId: item.id,
          })),
        );
        setOriginalPrices(loadedPrices);
        setFormError(null);
        setIsDisabled(true);
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_PRODUCT_FORM);
        setPrices([]);
        setOriginalPrices([]);
        setFormError(null);
        setIsDisabled(false);
      });
    }
  }, [id, existingProduct]);

  const { data: suppliersData } = useQuery(
    suppliersQueryOptions.list({ limit: "200", order_by: "name", order: "asc" }),
  );
  const { data: priceListsData } = useQuery(
    priceListsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
  );

  const suppliers = useMemo(
    () =>
      (Array.isArray(suppliersData)
        ? suppliersData
        : (suppliersData?.data ?? [])) as SupplierOption[],
    [suppliersData],
  );
  const priceLists = useMemo(() => {
    const availablePriceLists = (Array.isArray(priceListsData)
      ? priceListsData
      : (priceListsData?.data ?? [])) as PriceListOption[];
    const assignedPriceLists = (existingProduct?.productPrices ?? [])
      .map((item) => item.priceList)
      .flatMap((item) => (item ? [{ id: item.id, name: item.name }] : []));

    return Array.from(
      new Map(
        [...availablePriceLists, ...assignedPriceLists].map((item) => [
          item.id,
          item,
        ]),
      ).values(),
    );
  }, [existingProduct, priceListsData]);

  const handleChange = (event: ProductChangeEvent) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setFormError(null);
  };

  const addImageField = () => {
    setFormData((current) => ({
      ...current,
      images: [...current.images, ""],
    }));
  };

  const updateImageField = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) =>
        imageIndex === index ? value : image,
      ),
    }));
  };

  const removeImageField = (index: number) => {
    setFormData((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const addPriceField = () =>
    setPrices((current) => [...current, createEmptyPrice()]);

  const removePriceField = (index: number) => {
    setPrices((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const updatePriceField = (
    index: number,
    field: "price_list_id" | "price",
    value: string | number,
  ) => {
    setPrices((current) =>
      current.map((item, rowIndex) =>
        rowIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setFormError(null);
  };

  const mutation = useMutation(productEditorMutationOptions.save(queryClient));

  const validate = () => {
    if (!formData.name.trim() || !formData.supplier_id) {
      return "Completa el nombre y el proveedor.";
    }

    const stock = Number(formData.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return "El stock debe ser un número igual o mayor que cero.";
    }

    if (
      prices.some(
        (item) =>
          !item.price_list_id ||
          item.price === "" ||
          !Number.isFinite(Number(item.price)),
      )
    ) {
      return "Completa la lista y el importe de cada precio.";
    }

    const selectedLists = prices.map((item) => item.price_list_id);
    if (new Set(selectedLists).size !== selectedLists.length) {
      return "Cada lista de precios solo puede asignarse una vez.";
    }

    return null;
  };

  const handleSubmit = (action: SaveAction = "save") => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    mutation.mutate(
      {
        id,
        product: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          supplier_id: formData.supplier_id,
          stock: Number(formData.stock),
          unit: formData.unit,
          images: formData.images.map((image) => image.trim()).filter(Boolean),
        },
        prices: prices.map((item) => ({
          price_list_id: item.price_list_id,
          price: Number(item.price),
        })),
        existingPrices: originalPrices,
      },
      {
        onSuccess: (product) => {
          if (action === "save-and-new") {
            setFormData(EMPTY_PRODUCT_FORM);
            setPrices([]);
            setOriginalPrices([]);
          } else {
            setIsDisabled(true);
          }

          if (onSuccess) {
            onSuccess(action, product);
          } else {
            navigate("/products");
          }
        },
        onError: (error) => setFormError(error.message),
      },
    );
  };

  return {
    formData,
    prices,
    suppliers,
    priceLists,
    formError,
    isLoading: isLoadingProduct,
    isSaving: mutation.isPending,
    handleChange,
    addImageField,
    updateImageField,
    removeImageField,
    addPriceField,
    removePriceField,
    updatePriceField,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
