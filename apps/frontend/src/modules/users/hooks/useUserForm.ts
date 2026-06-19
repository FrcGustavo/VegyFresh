import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  rolesMutationOptions,
  rolesQueryOptions,
  usersMutationOptions,
  usersQueryOptions,
} from "../../../api";
import { validateImageFile } from "../../../utils/imageValidation";

type SaveAction = "save" | "save-and-close" | "save-and-new";
type UserChangeEvent = { target: { name: string; value: string } };
interface UserFormData {
  name: string;
  email: string;
  password: string;
  role_id: string;
  avatar_url: string;
}
interface RoleOption {
  id: string;
  name: string;
}
const EMPTY_USER_FORM: UserFormData = {
  name: "",
  email: "",
  password: "",
  role_id: "",
  avatar_url: "",
};

export function useUserForm(
  id?: string,
  onSuccess?: (action: SaveAction) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM);
  const [avatarFileError, setAvatarFileError] = useState("");
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingUser, isLoading } = useQuery({
    ...usersQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingUser) {
      queueMicrotask(() => {
        setFormData({
          name: existingUser.name,
          email: existingUser.email,
          password: "",
          role_id: existingUser.role_id || "",
          avatar_url: existingUser.avatar_url || "",
        });
        setAvatarFileError("");
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_USER_FORM);
        setAvatarFileError("");
      });
    }
  }, [id, existingUser]);

  const { data: rolesData } = useQuery(rolesQueryOptions.list());
  const roles = (
    Array.isArray(rolesData) ? rolesData : rolesData?.data || []
  ) as RoleOption[];

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

    setAvatarFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFormData((prev) => ({ ...prev, avatar_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const createAdminRoleMutation = useMutation(
    rolesMutationOptions.create(queryClient),
  );
  const createMutation = useMutation(usersMutationOptions.create(queryClient));
  const updateMutation = useMutation(usersMutationOptions.update(queryClient));

  const handleSubmit = (action: SaveAction = "save") => {
    const options = {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate("/users");
        }
      },
    };
    const commonInput = {
      name: formData.name,
      email: formData.email,
      role_id: formData.role_id,
      avatar_url: formData.avatar_url || undefined,
    };

    if (id) {
      updateMutation.mutate(
        {
          id,
          input: {
            ...commonInput,
            ...(formData.password ? { password: formData.password } : {}),
          },
        },
        options,
      );
    } else {
      createMutation.mutate(
        { ...commonInput, password: formData.password },
        options,
      );
    }
  };

  return {
    formData,
    avatarFileError,
    roles,
    isEditing: !!id,
    isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isCreatingRole: createAdminRoleMutation.isPending,
    handleChange,
    handleAvatarFileChange,
    handleSubmit,
    createAdminRole: () =>
      createAdminRoleMutation.mutate({ name: "Admin", permissions: [] }),
    isDisabled,
    setIsDisabled,
  };
}
