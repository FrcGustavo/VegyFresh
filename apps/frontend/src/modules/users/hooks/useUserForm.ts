import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';

export function useUserForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    role_id: '',
    avatar_url: '',
  });
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingUser, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchApi(`/users/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingUser) {
      setFormData({
        name: existingUser.name,
        email: existingUser.email,
        role_id: existingUser.role_id || '',
        avatar_url: existingUser.avatar_url || '',
      });
    }
  }, [existingUser]);

  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => fetchApi('/roles') });
  const roles = Array.isArray(rolesData) ? rolesData : (rolesData?.data || []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev: any) => ({ ...prev, avatar_url: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const createAdminRoleMutation = useMutation({
    mutationFn: () => fetchApi('/roles', {
      method: 'POST',
      body: JSON.stringify({ name: 'Admin', permissions: [] })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => fetchApi(id ? `/users/${id}` : '/users', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    mutation.mutate(formData, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/users');
        }
      }
    });
  };

  return {
    formData,
    roles,
    isLoading,
    isSaving: mutation.isPending,
    isCreatingRole: createAdminRoleMutation.isPending,
    handleChange,
    handleAvatarFileChange,
    handleSubmit,
    createAdminRole: () => createAdminRoleMutation.mutate(),
    isDisabled,
    setIsDisabled
  };
}
