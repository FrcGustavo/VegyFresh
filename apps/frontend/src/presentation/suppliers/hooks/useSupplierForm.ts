import { useState, useEffect } from "react";
import { useAppNavigate } from "@/presentation/router/useAppNavigation";
import type { Supplier } from "../../../domain/contacts/contact";
import type { SupplierFormData } from "../../../application/contacts/saveContact";
import { useSupplierEditor } from "../../../infrastructure/contacts/useContacts";
import { validateImageFile } from "@/presentation/utils/imageValidation";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type SupplierChangeEvent = { target: { name: string; value: string } };
const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  name: "",
  email: "",
  phone_number: "",
  logo_url: "",
};

export function useSupplierForm(
  id?: string,
  onSuccess?: (action: SaveAction, supplier: Supplier) => void,
) {
  const { detail: { data: existingSupplier, isLoading }, isSaving, save } = useSupplierEditor(id);
  const navigate = useAppNavigate();
  const [formData, setFormData] =
    useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [logoFileError, setLogoFileError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

  useEffect(() => {
    if (existingSupplier) {
      queueMicrotask(() => {
        setFormData({
          name: existingSupplier.name,
          email: existingSupplier.email || "",
          phone_number: existingSupplier.phone_number || "",
          logo_url: existingSupplier.logo_url || "",
        });
        setLogoFileError("");
        setFormError(null);
        setIsDisabled(true);
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_SUPPLIER_FORM);
        setLogoFileError("");
        setFormError(null);
        setIsDisabled(false);
      });
    }
  }, [id, existingSupplier]);

  const handleChange = (e: SupplierChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleLogoFileChange = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setLogoFileError(validationError);
      return;
    }

    setLogoFileError("");
    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFormData((prev) => ({ ...prev, logo_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (action: SaveAction = "save") => {
    setFormError(null);
    const onSaved = (supplier: Supplier) => {
        if (action === "save-and-new") {
          setFormData(EMPTY_SUPPLIER_FORM);
          setLogoFileError("");
        } else {
          setIsDisabled(true);
        }

        if (onSuccess) {
          onSuccess(action, supplier);
        } else {
          navigate("/suppliers");
        }
      };

    try {
      void save(formData).then(onSaved).catch((error: Error) => setFormError(error.message));
    } catch (error) {
      setFormError((error as Error).message);
    }
  };

  return {
    formData,
    logoFileError,
    formError,
    isLoading,
    isSaving,
    handleChange,
    handleLogoFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
