import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';
import { createClientRowId } from '../../../utils/clientRowId';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';
type OrderChangeEvent = { target: { name: string; value: string } };
interface ProductPriceRef {
  product_id: string;
  price: number;
}
interface ClientRef {
  id: string;
  priceList?: { productPrices?: ProductPriceRef[] } | null;
}
interface ProductRef {
  id: string;
  folio?: string | null;
  name?: string | null;
  unit?: string | null;
}
interface OrderFormItem {
  id?: string | number;
  clientRowId: string;
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
  folio: string;
  name: string;
  unit: string;
  product: ProductRef | null;
}
interface OrderFormData {
  client_id: string;
  user_id: string;
  status: string;
  origin: string;
  delivery_date: string;
  order_folio: string;
  created_at: string;
}
interface UserRef {
  id: string;
}
interface ExistingOrderItemRef {
  id?: string | number;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: ProductRef | null;
}
const EMPTY_FORM_DATA: OrderFormData = {
  client_id: '',
  user_id: '',
  status: 'PENDING_REVIEW',
  origin: 'WHATSAPP',
  delivery_date: '',
  order_folio: '',
  created_at: '',
};
const createEmptyItem = (): OrderFormItem => ({
  clientRowId: createClientRowId(),
  product_id: '',
  quantity: 1,
  unit_price: 0,
  folio: '',
  name: '',
  unit: '',
  product: null as ProductRef | null,
});

export function useOrderForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OrderFormData>(EMPTY_FORM_DATA);
  const [items, setItems] = useState<OrderFormItem[]>([createEmptyItem()]);
  const [isDisabled, setIsDisabled] = useState(!!id);
  const lookupTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lookupVersionRef = useRef<Record<string, number>>({});

  const { data: existingOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchApi(`/orders/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingOrder) {
      queueMicrotask(() => {
        setFormData({
          client_id: existingOrder.client_id,
          user_id: existingOrder.user_id,
          status: existingOrder.status,
          origin: existingOrder.origin,
          delivery_date: existingOrder.delivery_date
            ? String(existingOrder.delivery_date).slice(0, 10)
            : '',
          order_folio: existingOrder.folio || '',
          created_at: existingOrder.created_at
            ? String(existingOrder.created_at).slice(0, 10)
            : '',
        });
      });
      if (existingOrder.items?.length) {
        queueMicrotask(() => {
          setItems(existingOrder.items.map((item: ExistingOrderItemRef) => ({
            id: item.id,
            clientRowId: String(item.id ?? createClientRowId()),
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            folio: item.product?.folio || '',
            name: item.product?.name || '',
            unit: item.product?.unit || '',
            product: item.product ?? null,
          })));
        });
      } else {
        queueMicrotask(() => {
          setItems([createEmptyItem()]);
        });
      }
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_FORM_DATA);
        setItems([createEmptyItem()]);
      });
    }
  }, [id, existingOrder]);

  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => fetchApi('/clients') });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => fetchApi('/users') });

  const clients = useMemo(
    () => (Array.isArray(clientsData) ? clientsData : (clientsData?.data || [])) as ClientRef[],
    [clientsData],
  );
  const users = useMemo(
    () => (Array.isArray(usersData) ? usersData : (usersData?.data || [])) as UserRef[],
    [usersData],
  );

  useEffect(() => {
    if (!formData.user_id && users.length > 0) {
      queueMicrotask(() => {
        setFormData((prev) => ({ ...prev, user_id: users[0].id }));
      });
    }
  }, [users, formData.user_id]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === formData.client_id), [clients, formData.client_id]);

  useEffect(() => () => {
    Object.values(lookupTimersRef.current).forEach((timer) => clearTimeout(timer));
  }, []);

  const totalGeneral = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  }, [items]);

  const handleChange = (e: OrderChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addItemField = () => {
    setItems((prevItems) => [...prevItems, createEmptyItem()]);
  };

  const removeItemField = (index: number) => {
    const rowKey = items[index]?.clientRowId;
    if (rowKey) {
      clearTimeout(lookupTimersRef.current[rowKey]);
      delete lookupTimersRef.current[rowKey];
      delete lookupVersionRef.current[rowKey];
    }
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const updateItemField = (index: number, field: string, value: string | number | ProductRef | null) => {
    const rowKey = items[index]?.clientRowId;

    setItems((prevItems) => {
      const newItems = [...prevItems];
      if (!newItems[index]) return prevItems;
      
      if (field === 'product') {
        newItems[index].product = (value as ProductRef | null) ?? null;
      } else if (field === 'product_id') {
        newItems[index].product_id = String(value ?? '');
      } else if (field === 'quantity') {
        newItems[index].quantity = value as string | number;
      } else if (field === 'unit_price') {
        newItems[index].unit_price = value as string | number;
      } else if (field === 'folio') {
        newItems[index].folio = String(value ?? '');
      } else if (field === 'name') {
        newItems[index].name = String(value ?? '');
      } else if (field === 'unit') {
        newItems[index].unit = String(value ?? '');
      }

      if (field === 'product' && value) {
        const selectedProduct = value as ProductRef;
        newItems[index].product_id = selectedProduct.id;
        newItems[index].folio = selectedProduct.folio || '';
        newItems[index].name = selectedProduct.name || '';
        newItems[index].unit = selectedProduct.unit || '';
        const currentClient = clients.find((c) => c.id === formData.client_id);
        if (currentClient?.priceList?.productPrices) {
          const priceObj = currentClient.priceList.productPrices.find((p) => p.product_id === selectedProduct.id);
          if (priceObj) {
            newItems[index].unit_price = priceObj.price;
          } else {
            newItems[index].unit_price = 0;
          }
        } else {
          newItems[index].unit_price = 0;
        }
      }

      if (field === 'folio') {
        newItems[index].product_id = '';
        newItems[index].product = null;
      }

      if (field === 'name') {
        newItems[index].product_id = '';
        newItems[index].product = null;
      }

      return newItems;
    });

    if (field !== 'folio' && field !== 'name') {
      return;
    }

    if (!rowKey) return;

    const searchText = String(value ?? '').trim();
    if (lookupTimersRef.current[rowKey]) {
      clearTimeout(lookupTimersRef.current[rowKey]);
    }

    if (!searchText) {
      return;
    }

    const requestVersion = (lookupVersionRef.current[rowKey] ?? 0) + 1;
    lookupVersionRef.current[rowKey] = requestVersion;

    lookupTimersRef.current[rowKey] = setTimeout(async () => {
      const response = await fetchApi(`/products?search=${encodeURIComponent(searchText)}&limit=25&order_by=name&order=asc`);
      const productsFromApi = (Array.isArray(response) ? response : (response?.data || [])) as ProductRef[];
      const normalizedSearch = searchText.toLowerCase();
      const productMatch = productsFromApi.find((product) => {
        if (field === 'folio') {
          return String(product.folio ?? '').trim().toLowerCase() === normalizedSearch;
        }
        return String(product.name ?? '').trim().toLowerCase() === normalizedSearch;
      });

      setItems((prevItems) => {
        if (lookupVersionRef.current[rowKey] !== requestVersion) {
          return prevItems;
        }

        const currentIndex = prevItems.findIndex((item) => item.clientRowId === rowKey);
        const currentItem = prevItems[currentIndex];
        if (!currentItem) {
          return prevItems;
        }

        const currentValue = String(currentItem[field] ?? '').trim().toLowerCase();
        if (currentValue !== normalizedSearch) {
          return prevItems;
        }

        const nextItems = [...prevItems];
        if (!productMatch) {
          nextItems[currentIndex].product_id = '';
          nextItems[currentIndex].product = null;
          return nextItems;
        }

        nextItems[currentIndex].product_id = productMatch.id;
        nextItems[currentIndex].product = productMatch;
        nextItems[currentIndex].folio = productMatch.folio || '';
        nextItems[currentIndex].name = productMatch.name || '';
        nextItems[currentIndex].unit = productMatch.unit || '';

        if (selectedClient?.priceList?.productPrices) {
          const priceObj = selectedClient.priceList.productPrices.find(
            (p) => p.product_id === productMatch.id,
          );
          nextItems[currentIndex].unit_price = priceObj ? priceObj.price : 0;
        } else {
          nextItems[currentIndex].unit_price = 0;
        }

        return nextItems;
      });
    }, 300);
  };

  const mutation = useMutation({
    mutationFn: (data: {
      client_id: string;
      user_id: string;
      status: string;
      origin: string;
      delivery_date?: string;
      items: Array<{ product_id: string; quantity: number; unit_price: number }>;
    }) => fetchApi(id ? `/orders/${id}` : '/orders', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    const validItems = items.filter((item) => String(item.product_id || '').trim() !== '');

    if (validItems.length === 0) {
      alert("Debe agregar al menos un producto al pedido.");
      return;
    }

    setItems((prevItems) => {
      const nextItems = prevItems.filter((item) => String(item.product_id || '').trim() !== '');
      return nextItems.length > 0 ? nextItems : [createEmptyItem()];
    });

    const payload = {
      client_id: formData.client_id,
      user_id: formData.user_id,
      status: formData.status,
      origin: formData.origin,
      delivery_date: formData.delivery_date || undefined,
      items: validItems.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price)
      }))
    };
    mutation.mutate(payload, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/orders');
        }
      }
    });
  };

  return {
    formData,
    items,
    clients,
    users,
    totalGeneral,
    isLoading: isLoadingOrder,
    isSaving: mutation.isPending,
    handleChange,
    addItemField,
    removeItemField,
    updateItemField,
    handleSubmit,
    isDisabled,
    setIsDisabled
  };
}
