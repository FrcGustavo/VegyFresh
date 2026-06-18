import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { fetchApi } from "../../../../api";
import { createClientRowId } from "../../../../utils/clientRowId";

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

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchApi("/products"),
  });
  const products = (
    Array.isArray(productsData) ? productsData : productsData?.data || []
  ) as ProductOption[];

  const { data: existingPriceList, isLoading } = useQuery({
    queryKey: ["price-lists", id],
    queryFn: () => fetchApi(`/price-lists/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPriceList) {
      queueMicrotask(() => {
        setName(existingPriceList.name);
      });
      if (existingPriceList.productPrices) {
        queueMicrotask(() => {
          setProductsList(
            existingPriceList.productPrices.map((pp: ExistingProductPrice) => ({
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

  const mutation = useMutation({
    mutationFn: async () => {
      const priceList = id
        ? await fetchApi(`/price-lists/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          })
        : await fetchApi("/price-lists", {
            method: "POST",
            body: JSON.stringify({ name }),
          });

      const listId = id || priceList.id;

      for (const p of productsList) {
        const price = Number(p.price);
        if (p.product_id && price > 0) {
          await fetchApi("/product-prices", {
            method: "POST",
            body: JSON.stringify({
              price_list_id: listId,
              product_id: p.product_id,
              price,
            }),
          });
        }
      }
      return priceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
    },
  });

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
    mutation.mutate(undefined, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate("/price-lists");
        }
      },
    });
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
