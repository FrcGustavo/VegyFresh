import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  priceListEditorMutationOptions,
  priceListsQueryOptions,
  productsQueryOptions,
  type PriceList,
} from "../../../api";
import { createClientRowId } from "../../../utils/clientRowId";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
interface PriceListProductRow {
  clientRowId: string;
  product_id: string;
  name?: string;
  price: number | string;
  id?: string;
}
interface ProductOption {
  id: string;
  name: string;
}
interface ExistingProductPrice {
  product_id: string;
  product?: { name?: string };
  price: number;
  id?: string;
}

const createEmptyProductRow = (): PriceListProductRow => ({
  clientRowId: createClientRowId(),
  product_id: "",
  price: "",
});

const isEmptyProductRow = (row: PriceListProductRow) =>
  !row.product_id && row.price === "";

const deduplicateEmptyRows = (rows: PriceListProductRow[]) => {
  const emptyRows = rows.filter(isEmptyProductRow);
  return emptyRows.length <= 1
    ? rows
    : [...rows.filter((row) => !isEmptyProductRow(row)), emptyRows.at(-1)!];
};

export function usePriceListForm(
  id?: string,
  onSuccess?: (action: SaveAction, priceList: PriceList) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [productsList, setProductsList] = useState<PriceListProductRow[]>([
    createEmptyProductRow(),
  ]);
  const [isDisabled, setIsDisabled] = useState(!!id);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: productsData } = useQuery(
    productsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
  );

  const { data: existingPriceList, isLoading } = useQuery({
    ...priceListsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPriceList) {
      const productPrices = existingPriceList.productPrices ?? [];
      queueMicrotask(() => {
        setName(existingPriceList.name);
        setProductsList(
          [
            ...productPrices.map((pp: ExistingProductPrice) => ({
              clientRowId: String(pp.id ?? createClientRowId()),
              product_id: pp.product_id,
              name: pp.product?.name || "",
              price: Number(pp.price),
              id: pp.id,
            })),
            createEmptyProductRow(),
          ],
        );
        setFormError(null);
        setIsDisabled(true);
      });
    } else if (!id) {
      queueMicrotask(() => {
        setName("");
        setProductsList([createEmptyProductRow()]);
        setFormError(null);
        setIsDisabled(false);
      });
    }
  }, [id, existingPriceList]);

  const products = useMemo(() => {
    const availableProducts = (Array.isArray(productsData)
      ? productsData
      : (productsData?.data ?? [])) as ProductOption[];
    const assignedProducts = (existingPriceList?.productPrices ?? [])
      .map((item) => item.product)
      .flatMap((item) => (item ? [{ id: item.id, name: item.name }] : []));

    return Array.from(
      new Map(
        [...availableProducts, ...assignedProducts].map((item) => [
          item.id,
          item,
        ]),
      ).values(),
    );
  }, [existingPriceList, productsData]);

  const mutation = useMutation(
    priceListEditorMutationOptions.save(queryClient),
  );

  const addProductField = () => {
    setProductsList((current) =>
      current.some(isEmptyProductRow)
        ? current
        : [...current, createEmptyProductRow()],
    );
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setFormError(null);
  };

  const updateProductField = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    setProductsList((current) =>
      deduplicateEmptyRows(
        current.map((item, rowIndex) =>
          rowIndex === index ? { ...item, [field]: value } : item,
        ),
      ),
    );
    setFormError(null);
  };

  const selectProduct = (index: number, product: ProductOption | null) => {
    setProductsList((current) =>
      deduplicateEmptyRows(
        current.map((item, rowIndex) =>
          rowIndex === index
            ? {
                ...item,
                product_id: product?.id ?? "",
                name: product?.name ?? "",
              }
            : item,
        ),
      ),
    );
    setFormError(null);
  };

  const removeProductField = (index: number) => {
    setProductsList((current) => {
      const remaining = current.filter((_, rowIndex) => rowIndex !== index);
      return remaining.some(isEmptyProductRow)
        ? remaining
        : [...remaining, createEmptyProductRow()];
    });
    setFormError(null);
  };

  const handleSubmit = (action: SaveAction = "save") => {
    if (!name.trim()) {
      setFormError("Completa el nombre de la lista de precios.");
      return;
    }

    const assignedProducts = productsList.filter(
      (product) => product.product_id || product.price !== "",
    );

    if (
      assignedProducts.some(
        (product) =>
          !product.product_id ||
          product.price === "" ||
          !Number.isFinite(Number(product.price)) ||
          Number(product.price) < 0,
      )
    ) {
      setFormError("Completa el producto y un precio válido en cada fila.");
      return;
    }

    const selectedProducts = assignedProducts.map(
      (product) => product.product_id,
    );
    if (new Set(selectedProducts).size !== selectedProducts.length) {
      setFormError("Cada producto solo puede asignarse una vez.");
      return;
    }

    setFormError(null);
    mutation.mutate(
      {
        id,
        name: name.trim(),
        products: assignedProducts.map((product) => ({
          product_id: product.product_id,
          price: Number(product.price),
        })),
      },
      {
        onSuccess: (priceList) => {
          if (action === "save-and-new") {
            setName("");
            setProductsList([createEmptyProductRow()]);
          } else {
            setIsDisabled(true);
          }

          if (onSuccess) {
            onSuccess(action, priceList);
          } else {
            navigate("/price-lists");
          }
        },
        onError: (error) => setFormError(error.message),
      },
    );
  };

  return {
    name,
    setName: handleNameChange,
    productsList,
    products,
    isLoading,
    isSaving: mutation.isPending,
    formError,
    addProductField,
    updateProductField,
    selectProduct,
    removeProductField,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
