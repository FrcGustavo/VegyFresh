import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  suppliersMutationOptions,
  suppliersQueryOptions,
} from "../../../api";
import { validateImageFile } from "../../../utils/imageValidation";

type SaveAction = "save" | "save-and-close" | "save-and-new";
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
  onSuccess?: (action: SaveAction) => void,
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] =
    useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [logoFileError, setLogoFileError] = useState("");
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
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_SUPPLIER_FORM);
        setLogoFileError("");
      });
    }
  }, [id, existingSupplier]);

  const handleChange = (e: SupplierChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoFileChange = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setLogoFileError(validationError);
      return;
    }

    setLogoFileError("");
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
    const options = {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate("/suppliers");
        }
      },
    };

    if (id) {
      updateMutation.mutate({ id, input: formData }, options);
    } else {
      createMutation.mutate(formData, options);
    }
  };

  return {
    formData,
    logoFileError,
    isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    handleChange,
    handleLogoFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
