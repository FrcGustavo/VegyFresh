import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../../api';

export function usePriceListForm(id?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [productsList, setProductsList] = useState<any[]>([]);

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => fetchApi('/products') });
  const products = Array.isArray(productsData) ? productsData : (productsData?.data || []);

  const { data: existingPriceList, isLoading } = useQuery({
    queryKey: ['price-lists', id],
    queryFn: () => fetchApi(`/price-lists/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPriceList) {
      setName(existingPriceList.name);
      // Extraer precios actuales de la lista
      if (existingPriceList.productPrices) {
        setProductsList(existingPriceList.productPrices.map((pp: any) => ({
          product_id: pp.product_id,
          price: pp.price,
          id: pp.id // Importante para actualizaciones si fuera necesario
        })));
      }
    }
  }, [existingPriceList]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceList = id 
        ? await fetchApi(`/price-lists/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
        : await fetchApi('/price-lists', { method: 'POST', body: JSON.stringify({ name }) });
      
      const listId = id || priceList.id;

      // Simplificación: eliminar y recrear precios o actualizarlos
      // Por ahora recreamos para mantener consistencia con el diseño actual
      if (id) {
        // En una implementación real, esto debería ser un bulk update en el backend
      }

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
      navigate('/price-lists');
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
    handleSubmit: (e: React.FormEvent) => { e.preventDefault(); mutation.mutate(); }
  };
}
