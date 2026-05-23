import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';

export function useProductForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    sku: '',
    name: '',
    description: '',
    stock: 0,
    supplier_id: '',
  });
  const [prices, setPrices] = useState<any[]>([]);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchApi(`/products/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        sku: existingProduct.sku,
        name: existingProduct.name,
        description: existingProduct.description,
        stock: existingProduct.stock,
        supplier_id: existingProduct.supplier_id,
      });
      if (existingProduct.productPrices) {
        setPrices(existingProduct.productPrices.map((p: any) => ({
          price_list_id: p.price_list_id,
          price: p.price
        })));
      }
    } else if (!id) {
      setFormData({
        sku: '',
        name: '',
        description: '',
        stock: 0,
        supplier_id: '',
      });
      setPrices([]);
    }
  }, [id, existingProduct]);

  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => fetchApi('/suppliers') });
  const { data: priceListsData } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });

  const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data || []);
  const priceLists = Array.isArray(priceListsData) ? priceListsData : (priceListsData?.data || []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const addPriceField = () => {
    setPrices([...prices, { price_list_id: '', price: '' }]);
  };

  const removePriceField = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const updatePriceField = (index: number, field: string, value: any) => {
    const newPrices = [...prices];
    newPrices[index][field] = value;
    setPrices(newPrices);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/products/${id}` : '/products', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    const payload = { ...formData, prices };
    mutation.mutate(payload, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/products');
        }
      }
    });
  };

  return {
    formData,
    prices,
    suppliers,
    priceLists,
    isLoading: isLoadingProduct,
    isSaving: mutation.isPending,
    handleChange,
    addPriceField,
    removePriceField,
    updatePriceField,
    handleSubmit,
    isDisabled,
    setIsDisabled
  };
}
