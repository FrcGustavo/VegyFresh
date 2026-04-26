import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

export function useOrderForm(id?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    client_id: '',
    user_id: '', // Se podría sacar del contexto de auth después
    status: 'PENDING_REVIEW',
    origin: 'WHATSAPP'
  });
  const [items, setItems] = useState<any[]>([]);

  // Fetch initial data if editing
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
        origin: existingOrder.origin
      });
      if (existingOrder.items) {
        setItems(existingOrder.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product: item.product // Necesario para el Autocomplete
        })));
      }
    }
  }, [existingOrder]);

  // Fetch dependencies
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => fetchApi('/clients') });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => fetchApi('/users') });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => fetchApi('/products') });

  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);
  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const products = Array.isArray(productsData) ? productsData : (productsData?.data || []);

  const selectedClient = useMemo(() => clients.find((c: any) => c.id === formData.client_id), [clients, formData.client_id]);

  const totalGeneral = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  }, [items]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const addItemField = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, product: null }]);
  };

  const removeItemField = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product' && value) {
      newItems[index].product_id = value.id;
      // Buscar precio en la lista del cliente
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
    setItems(newItems);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/orders/${id}` : '/orders', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Debe agregar al menos un producto al pedido.");
      return;
    }
    const payload = { 
      ...formData, 
      items: items.map(i => ({ product_id: i.product_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })) 
    };
    mutation.mutate(payload);
  };

  return {
    formData,
    items,
    clients,
    users,
    products,
    totalGeneral,
    isLoading: isLoadingOrder,
    isSaving: mutation.isPending,
    handleChange,
    addItemField,
    removeItemField,
    updateItemField,
    handleSubmit
  };
}
