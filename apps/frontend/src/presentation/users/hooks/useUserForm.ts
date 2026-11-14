import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { UserFormData } from "../../../application/catalog/saveCatalog";
import { useUserEditor } from "../../../infrastructure/catalog/useCatalog";
import { validateImageFile } from "@/presentation/utils/imageValidation";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type UserChangeEvent = { target: { name: string; value: string } };
const EMPTY_USER_FORM: UserFormData = {
  name: "",
  email: "",
  password: "",
  role_id: "",
  avatar_url: "",
};

export function useUserForm(
  id?: string,
  onSuccess?: (action: SaveAction, user: { id: string }) => void,
) {
  const {
    detail: { data: existingUser, isLoading },
    roles,
    isSaving,
    isCreatingRole,
    createAdminRole,
    save,
  } = useUserEditor(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM);
  const [avatarFileError, setAvatarFileError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

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
        setFormError(null);
        setIsDisabled(true);
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_USER_FORM);
        setAvatarFileError("");
        setFormError(null);
        setIsDisabled(false);
      });
    }
  }, [id, existingUser]);

  const handleChange = (e: UserChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleAvatarFileChange = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setAvatarFileError(validationError);
      return;
    }

    setAvatarFileError("");
    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFormData((prev) => ({ ...prev, avatar_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (action: SaveAction = "save") => {
    setFormError(null);
    try {
      void save(formData)
        .then((user) => {
          if (action === "save-and-new") {
            setFormData(EMPTY_USER_FORM);
            setAvatarFileError("");
          } else {
            setIsDisabled(true);
          }
          if (onSuccess) onSuccess(action, user);
          else navigate("/users");
        })
        .catch((error: Error) => setFormError(error.message));
    } catch (error) {
      setFormError((error as Error).message);
    }
  };

  return {
    formData,
    avatarFileError,
    formError,
    roles,
    isEditing: !!id,
    isLoading,
    isSaving,
    isCreatingRole,
    handleChange,
    handleAvatarFileChange,
    handleSubmit,
    createAdminRole,
    isDisabled,
    setIsDisabled,
  };
}
