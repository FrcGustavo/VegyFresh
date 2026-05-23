import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';

export function useSupplierForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone_number: '',
    logo_url: ''
  });
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingSupplier, isLoading } = useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => fetchApi(`/suppliers/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingSupplier) {
      setFormData({
        name: existingSupplier.name,
        email: existingSupplier.email || '',
        phone_number: existingSupplier.phone_number || '',
        logo_url: existingSupplier.logo_url || ''
      });
    } else if (!id) {
      setFormData({
        name: '',
        email: '',
        phone_number: '',
        logo_url: ''
      });
    }
  }, [id, existingSupplier]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleLogoFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev: any) => ({ ...prev, logo_url: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/suppliers/${id}` : '/suppliers', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    mutation.mutate(formData, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/suppliers');
        }
      }
    });
  };

  return {
    formData,
    isLoading,
    isSaving: mutation.isPending,
    handleChange,
    handleLogoFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled
  };
}
