import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  suppliersMutationOptions,
  suppliersQueryOptions,
  type Supplier,
} from "../../../api";
import { validateImageFile } from "../../../utils/imageValidation";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type SupplierChangeEvent = { target: { name: string; value: string } };
interface SupplierFormData {
  name: string;
  email: string;
  phone_number: string;
  logo_url: string;
}
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] =
    useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [logoFileError, setLogoFileError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingSupplier, isLoading } = useQuery({
    ...suppliersQueryOptions.detail(id ?? ""),
    enabled: !!id,
  });

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

  const createMutation = useMutation(
    suppliersMutationOptions.create(queryClient),
  );
  const updateMutation = useMutation(
    suppliersMutationOptions.update(queryClient),
  );

  const handleSubmit = (action: SaveAction = "save") => {
    if (!formData.name.trim()) {
      setFormError("Completa el nombre del proveedor.");
      return;
    }

    const input = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone_number: formData.phone_number.trim() || null,
      logo_url: formData.logo_url.trim() || null,
    };

    setFormError(null);
    const options = {
      onSuccess: (supplier: Supplier) => {
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
      },
      onError: (error: Error) => setFormError(error.message),
    };

    if (id) {
      updateMutation.mutate({ id, input }, options);
    } else {
      createMutation.mutate(input, options);
    }
  };

  return {
    formData,
    logoFileError,
    formError,
    isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    handleChange,
    handleLogoFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
