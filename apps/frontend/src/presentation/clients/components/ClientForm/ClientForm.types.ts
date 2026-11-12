export type ClientFormSection = "general" | "address" | "price-list";
export type ClientChangeEvent = { target: { name: string; value: string } };

export interface ClientFormData {
  name: string;
  phone_number: string;
  email: string;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  address: string;
  suburb: string;
  external_number: string;
  internal_number: string;
  avatar_url: string;
  price_list_id: string;
}

export interface PriceListOption {
  id: string;
  name: string;
}

export interface ClientFormProps {
  formData: ClientFormData;
  priceLists: PriceListOption[];
  avatarFileError?: string;
  countries: string[];
  states: string[];
  cities: string[];
  postalCodeOptions: string[];
  coloniaOptions: string[];
  handleChange: (e: ClientChangeEvent) => void;
  handleAvatarFileChange: (file: File) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  section: ClientFormSection;
  isDisabled?: boolean;
}
