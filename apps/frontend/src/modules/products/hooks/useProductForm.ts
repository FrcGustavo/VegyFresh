import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';
type ProductChangeEvent = { target: { name: string; value: string } };
interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  stock: number;
  supplier_id: string;
}
interface ProductPrice {
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
  sku: '',
  name: '',
  description: '',
  stock: 0,
  supplier_id: '',
};

const createClientRowId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptyPrice = (): ProductPrice => ({
  clientRowId: createClientRowId(),
  price_list_id: '',
  price: '',
});

export function useProductForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchApi(`/products/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingProduct) {
      queueMicrotask(() => {
        setFormData({
          sku: existingProduct.sku,
          name: existingProduct.name,
          description: existingProduct.description,
          stock: existingProduct.stock,
          supplier_id: existingProduct.supplier_id,
        });
      });
      if (existingProduct.productPrices) {
        queueMicrotask(() => {
          setPrices(existingProduct.productPrices.map((p: { price_list_id: string; price: number }) => ({
            clientRowId: createClientRowId(),
            price_list_id: p.price_list_id,
            price: p.price,
          })));
        });
      }
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_PRODUCT_FORM);
        setPrices([]);
      });
    }
  }, [id, existingProduct]);

  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => fetchApi('/suppliers') });
  const { data: priceListsData } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });

  const suppliers = (Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data || [])) as SupplierOption[];
  const priceLists = (Array.isArray(priceListsData) ? priceListsData : (priceListsData?.data || [])) as PriceListOption[];

  const handleChange = (e: ProductChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'stock' ? Number(value) : value }));
  };

  const addPriceField = () => {
    setPrices([...prices, createEmptyPrice()]);
  };

  const removePriceField = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const updatePriceField = (index: number, field: string, value: string | number) => {
    const newPrices = [...prices];
    if (field === 'price_list_id') {
      newPrices[index].price_list_id = String(value);
    } else if (field === 'price') {
      newPrices[index].price = value;
    }
    setPrices(newPrices);
  };

  const mutation = useMutation({
    mutationFn: (data: ProductFormData & { prices: ProductPrice[] }) => fetchApi(id ? `/products/${id}` : '/products', {
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
