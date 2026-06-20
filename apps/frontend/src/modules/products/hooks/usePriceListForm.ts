import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  priceListEditorMutationOptions,
  priceListsQueryOptions,
  productsQueryOptions,
} from "../../../api";
import { createClientRowId } from "../../../utils/clientRowId";

type SaveAction = "save" | "save-and-close" | "save-and-new";
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
  price: 0,
});

export function usePriceListForm(
  id?: string,
  onSuccess?: (action: SaveAction) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [productsList, setProductsList] = useState<PriceListProductRow[]>(
    id ? [] : [createEmptyProductRow()],
  );
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: productsData } = useQuery(productsQueryOptions.list());
  const products = (
    Array.isArray(productsData) ? productsData : productsData?.data || []
  ) as ProductOption[];

  const { data: existingPriceList, isLoading } = useQuery({
    ...priceListsQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPriceList) {
      queueMicrotask(() => {
        setName(existingPriceList.name);
      });
      if (existingPriceList.productPrices) {
        const productPrices = existingPriceList.productPrices;
        queueMicrotask(() => {
          setProductsList(
            productPrices.map((pp: ExistingProductPrice) => ({
              clientRowId: String(pp.id ?? createClientRowId()),
              product_id: pp.product_id,
              name: pp.product?.name || "",
              price: pp.price,
              id: pp.id,
            })),
          );
        });
      }
    } else if (!id) {
      queueMicrotask(() => {
        setName("");
        setProductsList([createEmptyProductRow()]);
      });
    }
  }, [id, existingPriceList]);

  const mutation = useMutation(
    priceListEditorMutationOptions.save(queryClient),
  );

  const addProductField = () =>
    setProductsList((prevProducts) => [
      ...prevProducts,
      createEmptyProductRow(),
    ]);

  const updateProductField = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newList = [...productsList];
    if (field === "product_id") {
      newList[index].product_id = String(value);
    } else if (field === "name") {
      newList[index].name = String(value);
    } else if (field === "price") {
      newList[index].price = value;
    }
    setProductsList(newList);
  };

  const removeProductField = (index: number) => {
    setProductsList((prevProducts) =>
      prevProducts.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = (action: SaveAction = "save") => {
    mutation.mutate(
      {
        id,
        name,
        products: productsList
          .map((product) => ({
            product_id: product.product_id,
            price: Number(product.price),
          }))
          .filter((product) => product.product_id && product.price > 0),
      },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess(action);
          } else {
            navigate("/price-lists");
          }
        },
      },
    );
  };

  return {
    name,
    setName,
    productsList,
    products,
    isLoading,
    isSaving: mutation.isPending,
    addProductField,
    updateProductField,
    removeProductField,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
