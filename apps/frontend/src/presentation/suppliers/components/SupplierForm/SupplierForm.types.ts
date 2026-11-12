export type SupplierChangeEvent = { target: { name: string; value: string } };

export interface SupplierFormData {
  name: string;
  email: string;
  phone_number: string;
  logo_url: string;
}

export interface SupplierFormProps {
  formData: SupplierFormData;
  logoFileError?: string;
  handleChange: (e: SupplierChangeEvent) => void;
  handleLogoFileChange: (file: File) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  isDisabled?: boolean;
}
