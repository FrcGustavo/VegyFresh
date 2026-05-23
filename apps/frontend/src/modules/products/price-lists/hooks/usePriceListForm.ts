import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';

export function usePriceListForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [productsList, setProductsList] = useState<any[]>(id ? [] : [{ product_id: '', price: 0 }]);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => fetchApi('/products') });
  const products = Array.isArray(productsData) ? productsData : (productsData?.data || []);

  // console.log({ productsData })

  const { data: existingPriceList, isLoading } = useQuery({
    queryKey: ['price-lists', id],
    queryFn: () => fetchApi(`/price-lists/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPriceList) {
      setName(existingPriceList.name);
      if (existingPriceList.productPrices) {
        setProductsList(existingPriceList.productPrices.map((pp: any) => ({
          product_id: pp.product_id,
          name: pp.product?.name || '',
          price: pp.price,
          id: pp.id
        })));
      }
    } else if (!id) {
      setName('');
      setProductsList([{ product_id: '', price: 0 }]);
    }
  }, [id, existingPriceList]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceList = id 
        ? await fetchApi(`/price-lists/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
        : await fetchApi('/price-lists', { method: 'POST', body: JSON.stringify({ name }) });
      
      const listId = id || priceList.id;

      for (const p of productsList) {
        if (p.product_id && p.price > 0) {
          await fetchApi('/product-prices', {
            method: 'POST',
            body: JSON.stringify({
              price_list_id: listId,
              product_id: p.product_id,
              price: Number(p.price)
            })
          });
        }
      }
      return priceList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      queryClient.invalidateQueries({ queryKey: ['product-prices'] });
    }
  });

  const addProductField = () => setProductsList([...productsList, { product_id: '', price: 0 }]);
  
  const updateProductField = (index: number, field: string, value: any) => {
    const newList = [...productsList];
    newList[index][field] = value;
    setProductsList(newList);
  };

  const removeProductField = (index: number) => {
    setProductsList(productsList.filter((_, i) => i !== index));
  };

  const handleSubmit = (action: SaveAction = 'save') => {
    mutation.mutate(undefined, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/price-lists');
        }
      }
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
    setIsDisabled
  };
}
