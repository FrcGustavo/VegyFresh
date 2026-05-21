import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';

export function useClientForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    price_list_id: ''
  });
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingClient, isLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => fetchApi(`/clients/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingClient) {
      setFormData({
        name: existingClient.name,
        phone_number: existingClient.phone_number,
        email: existingClient.email || '',
        address: existingClient.address || '',
        price_list_id: existingClient.price_list_id || ''
      });
    }
  }, [existingClient]);

  const { data: priceListsData } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });
  const priceLists = Array.isArray(priceListsData) ? priceListsData : (priceListsData?.data || []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/clients/${id}` : '/clients', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    mutation.mutate(formData, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/clients');
        }
      }
    });
  };

  return {
    formData,
    priceLists,
    isLoading,
    isSaving: mutation.isPending,
    handleChange,
    handleSubmit,
    isDisabled,
    setIsDisabled
  };
}
