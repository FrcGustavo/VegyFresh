import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';
import { authStorage } from '../../../auth/authStorage';
import { validateImageFile } from '../../../utils/imageValidation';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';
type UserChangeEvent = { target: { name: string; value: string } };
interface UserFormData {
  name: string;
  email: string;
  password: string;
  role_id: string;
  organization_role: 'member' | 'admin';
  avatar_url: string;
}
interface RoleOption {
  id: string;
  name: string;
}
const EMPTY_USER_FORM: UserFormData = {
  name: '',
  email: '',
  password: '',
  role_id: '',
  organization_role: 'member',
  avatar_url: '',
};

const extractOrganizationRoleFromAccessToken = (): string | null => {
  const accessToken = authStorage.getAccessToken();
  if (!accessToken) {
    return null;
  }

  const tokenParts = accessToken.split('.');
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(atob(paddedPayload)) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
};

export function useUserForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM);
  const [avatarFileError, setAvatarFileError] = useState('');
  const [isDisabled, setIsDisabled] = useState(!!id);
  const currentMembershipRole = extractOrganizationRoleFromAccessToken();
  const canAssignOrganizationRole = currentMembershipRole === 'owner';

  const { data: existingUser, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchApi(`/users/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingUser) {
      queueMicrotask(() => {
        setFormData({
          name: existingUser.name,
          email: existingUser.email,
          password: '',
          role_id: existingUser.role_id || '',
          organization_role: 'member',
          avatar_url: existingUser.avatar_url || '',
        });
        setAvatarFileError('');
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_USER_FORM);
        setAvatarFileError('');
      });
    }
  }, [id, existingUser]);

  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => fetchApi('/roles') });
  const roles = (Array.isArray(rolesData) ? rolesData : (rolesData?.data || [])) as RoleOption[];

  const handleChange = (e: UserChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setAvatarFileError(validationError);
      return;
    }

    setAvatarFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setFormData((prev) => ({ ...prev, avatar_url: result }));
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
    mutationFn: (data: UserFormData) => {
      const payload: Partial<UserFormData> = {
        name: data.name,
        email: data.email,
        role_id: data.role_id,
        avatar_url: data.avatar_url || undefined,
      };

      if (!id && canAssignOrganizationRole) {
        payload.organization_role = data.organization_role;
      }

      if (!id || data.password) {
        payload.password = data.password;
      }

      return fetchApi(id ? `/users/${id}` : '/users', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
    },
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
    avatarFileError,
    roles,
    isEditing: !!id,
    canAssignOrganizationRole,
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
