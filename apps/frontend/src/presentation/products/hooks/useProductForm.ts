import { useEffect, useMemo, useState } from "react";
import { useAppNavigate } from "@/presentation/router/useAppNavigation";
import type {
  ProductFormData,
  ProductPriceRow,
} from "../../../application/catalog/saveCatalog";
import { useProductEditor } from "../../../infrastructure/catalog/useCatalog";
import { createClientRowId } from "@/infrastructure/identifiers/clientRowId";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type ProductChangeEvent = { target: { name: string; value: string } };

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
  onSuccess?: (action: SaveAction, product: { id: string }) => void,
) {
  const {
    detail: { data: existingProduct, isLoading: isLoadingProduct },
    suppliers: suppliersData,
    priceLists: priceListsData,
    isSaving,
    save,
  } = useProductEditor(id);
  const navigate = useAppNavigate();
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [prices, setPrices] = useState<ProductPriceRow[]>([]);
  const [originalPrices, setOriginalPrices] = useState<
    Array<{ id: string; price_list_id: string; price: number }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

  useEffect(() => {
    if (existingProduct) {
      const loadedPrices = (existingProduct.productPrices ?? []).map(
        (item) => ({
          id: item.id,
          price_list_id: item.price_list_id,
          price: Number(item.price),
        }),
      );

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

  const suppliers = useMemo(
    () =>
      (Array.isArray(suppliersData)
        ? suppliersData
        : (suppliersData?.data ?? [])) as SupplierOption[],
    [suppliersData],
  );
  const priceLists = useMemo(() => {
    const availablePriceLists = (
      Array.isArray(priceListsData)
        ? priceListsData
        : (priceListsData?.data ?? [])
    ) as PriceListOption[];
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

  const handleSubmit = (action: SaveAction = "save") => {
    setFormError(null);
    try {
      void save(formData, prices, originalPrices)
        .then((product) => {
          if (action === "save-and-new") {
            setFormData(EMPTY_PRODUCT_FORM);
            setPrices([]);
            setOriginalPrices([]);
          } else {
            setIsDisabled(true);
          }
          if (onSuccess) onSuccess(action, product);
          else navigate("/products");
        })
        .catch((error: Error) => setFormError(error.message));
    } catch (error) {
      setFormError((error as Error).message);
    }
  };

  return {
    formData,
    prices,
    suppliers,
    priceLists,
    formError,
    isLoading: isLoadingProduct,
    isSaving,
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
