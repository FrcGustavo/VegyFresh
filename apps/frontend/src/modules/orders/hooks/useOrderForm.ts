import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';
const EMPTY_ITEM = {
  product_id: '',
  quantity: 1,
  unit_price: 0,
  folio: '',
  name: '',
  unit: '',
  product: null,
};

export function useOrderForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    client_id: '',
    user_id: '',
    status: 'PENDING_REVIEW',
    origin: 'WHATSAPP',
    delivery_date: '',
    order_folio: '',
    created_at: '',
  });
  const [items, setItems] = useState<any[]>([{ ...EMPTY_ITEM }]);
  const [isDisabled, setIsDisabled] = useState(!!id);
  const lookupTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const lookupVersionRef = useRef<Record<number, number>>({});

  const { data: existingOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchApi(`/orders/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingOrder) {
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
      if (existingOrder.items?.length) {
        setItems(existingOrder.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          folio: item.product?.folio || '',
          name: item.product?.name || '',
          unit: item.product?.unit || '',
          product: item.product
        })));
      } else {
        setItems([{ ...EMPTY_ITEM }]);
      }
    }
  }, [existingOrder]);

  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => fetchApi('/clients') });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => fetchApi('/users') });

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);
  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);

  useEffect(() => {
    if (!formData.user_id && users.length > 0) {
      setFormData((prev: any) => ({ ...prev, user_id: users[0].id }));
    }
  }, [users, formData.user_id]);

  const selectedClient = useMemo(() => clients.find((c: any) => c.id === formData.client_id), [clients, formData.client_id]);

  useEffect(() => () => {
    Object.values(lookupTimersRef.current).forEach((timer) => clearTimeout(timer));
  }, []);

  const totalGeneral = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  }, [items]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const addItemField = () => {
    setItems([
      ...items,
      { ...EMPTY_ITEM },
    ]);
  };

  const removeItemField = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product' && value) {
      newItems[index].product_id = value.id;
      newItems[index].folio = value.folio || '';
      newItems[index].name = value.name || '';
      newItems[index].unit = value.unit || '';
      if (selectedClient?.priceList?.productPrices) {
        const priceObj = selectedClient.priceList.productPrices.find((p: any) => p.product_id === value.id);
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
    setItems(newItems);

    if (field !== 'folio' && field !== 'name') {
      return;
    }

    const searchText = String(value ?? '').trim();
    if (lookupTimersRef.current[index]) {
      clearTimeout(lookupTimersRef.current[index]);
    }

    if (!searchText) {
      return;
    }

    const requestVersion = (lookupVersionRef.current[index] ?? 0) + 1;
    lookupVersionRef.current[index] = requestVersion;

    lookupTimersRef.current[index] = setTimeout(async () => {
      const response = await fetchApi(`/products?search=${encodeURIComponent(searchText)}&limit=25&order_by=name&order=asc`);
      const productsFromApi = Array.isArray(response) ? response : (response?.data || []);
      const normalizedSearch = searchText.toLowerCase();
      const productMatch = productsFromApi.find((product: any) => {
        if (field === 'folio') {
          return String(product.folio ?? '').trim().toLowerCase() === normalizedSearch;
        }
        return String(product.name ?? '').trim().toLowerCase() === normalizedSearch;
      });

      setItems((prevItems) => {
        if (lookupVersionRef.current[index] !== requestVersion) {
          return prevItems;
        }

        const currentItem = prevItems[index];
        if (!currentItem) {
          return prevItems;
        }

        const currentValue = String(currentItem[field] ?? '').trim().toLowerCase();
        if (currentValue !== normalizedSearch) {
          return prevItems;
        }

        const nextItems = [...prevItems];
        if (!productMatch) {
          nextItems[index].product_id = '';
          nextItems[index].product = null;
          return nextItems;
        }

        nextItems[index].product_id = productMatch.id;
        nextItems[index].product = productMatch;
        nextItems[index].folio = productMatch.folio || '';
        nextItems[index].name = productMatch.name || '';
        nextItems[index].unit = productMatch.unit || '';

        if (selectedClient?.priceList?.productPrices) {
          const priceObj = selectedClient.priceList.productPrices.find(
            (p: any) => p.product_id === productMatch.id,
          );
          nextItems[index].unit_price = priceObj ? priceObj.price : 0;
        } else {
          nextItems[index].unit_price = 0;
        }

        return nextItems;
      });
    }, 300);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/orders/${id}` : '/orders', {
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
      return nextItems.length > 0 ? nextItems : [{ ...EMPTY_ITEM }];
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
