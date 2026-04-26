import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';

export function useUserForm(id?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    role_id: ''
  });

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
        role_id: existingUser.role_id || ''
      });
    }
  }, [existingUser]);

  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => fetchApi('/roles') });
  const roles = Array.isArray(rolesData) ? rolesData : (rolesData?.data || []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
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
      navigate('/users');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return {
    formData,
    roles,
    isLoading,
    isSaving: mutation.isPending,
    isCreatingRole: createAdminRoleMutation.isPending,
    handleChange,
    handleSubmit,
    createAdminRole: () => createAdminRoleMutation.mutate()
  };
}
