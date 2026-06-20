export type UserChangeEvent = { target: { name: string; value: string } };

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role_id: string;
  avatar_url: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export interface UserFormProps {
  formData: UserFormData;
  avatarFileError?: string;
  roles: RoleOption[];
  isEditing: boolean;
  isCreatingRole: boolean;
  handleChange: (e: UserChangeEvent) => void;
  handleAvatarFileChange: (file: File) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  createAdminRole: () => void;
  isDisabled?: boolean;
}
