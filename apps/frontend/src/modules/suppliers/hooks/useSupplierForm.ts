import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

export function useSupplierForm(id?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    name: '',
    contact_info: '',
    logo_url: ''
  });

  const { data: existingSupplier, isLoading } = useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => fetchApi(`/suppliers/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingSupplier) {
      setFormData({
        name: existingSupplier.name,
        contact_info: existingSupplier.contact_info || '',
        logo_url: existingSupplier.logo_url || ''
      });
    }
  }, [existingSupplier]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/suppliers/${id}` : '/suppliers', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      navigate('/suppliers');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return {
    formData,
    isLoading,
    isSaving: mutation.isPending,
    handleChange,
    handleSubmit
  };
}
