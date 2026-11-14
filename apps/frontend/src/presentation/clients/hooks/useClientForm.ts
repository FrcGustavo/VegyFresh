import { useState, useEffect } from "react";
import { useAppNavigate } from "@/presentation/router/useAppNavigation";
import type { Client } from "../../../domain/contacts/contact";
import type { ClientFormData } from "../../../application/contacts/saveContact";
import { useClientEditor } from "../../../infrastructure/contacts/useContacts";
import { validateImageFile } from "@/presentation/utils/imageValidation";
import {
  findLocationByPostalCode,
  getCitiesByCountryAndState,
  getColoniasByLocation,
  getCountries,
  getPostalCodesByLocation,
  getStatesByCountry,
} from "@/domain/clients/locationCatalog";

export type SaveAction = "save" | "save-and-close" | "save-and-new";
type ClientChangeEvent = { target: { name: string; value: string } };
const EMPTY_CLIENT_FORM: ClientFormData = {
  name: "",
  phone_number: "",
  email: "",
  country: "",
  state: "",
  city: "",
  postal_code: "",
  address: "",
  suburb: "",
  external_number: "",
  internal_number: "",
  avatar_url: "",
  price_list_id: "",
};

export function useClientForm(
  id?: string,
  onSuccess?: (action: SaveAction, client: Client) => void,
) {
  const { detail: { data: existingClient, isLoading }, priceLists, isSaving, save } = useClientEditor(id);
  const navigate = useAppNavigate();
  const [formData, setFormData] = useState<ClientFormData>(EMPTY_CLIENT_FORM);
  const [avatarFileError, setAvatarFileError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!id);

  useEffect(() => {
    if (existingClient) {
      queueMicrotask(() => {
        setFormData({
          name: existingClient.name,
          phone_number: existingClient.phone_number,
          email: existingClient.email || "",
          country: existingClient.country || "",
          state: existingClient.state || "",
          city: existingClient.city || "",
          postal_code: existingClient.postal_code || "",
          address: existingClient.address || "",
          suburb: existingClient.suburb || "",
          external_number: existingClient.external_number || "",
          internal_number: existingClient.internal_number || "",
          avatar_url: existingClient.avatar_url || "",
          price_list_id: existingClient.price_list_id || "",
        });
        setAvatarFileError("");
        setFormError(null);
        setIsDisabled(true);
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_CLIENT_FORM);
        setAvatarFileError("");
        setFormError(null);
        setIsDisabled(false);
      });
    }
  }, [id, existingClient]);

  const handleChange = (e: ClientChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "country") {
        next.state = "";
        next.city = "";
        next.suburb = "";
      }

      if (name === "state") {
        next.city = "";
        next.suburb = "";
      }

      if (name === "city") {
        next.suburb = "";
      }

      if (name === "postal_code") {
        const locationMatch = findLocationByPostalCode(String(value));
        if (locationMatch) {
          next.country = locationMatch.country;
          next.state = locationMatch.state;
          next.city = locationMatch.city;
          next.suburb =
            locationMatch.colonias.length === 1
              ? locationMatch.colonias[0]
              : "";
        }
      }

      return next;
    });
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
    const onSaved = (client: Client) => {
        if (action === "save-and-new") {
          setFormData(EMPTY_CLIENT_FORM);
          setAvatarFileError("");
        } else {
          setIsDisabled(true);
        }

        if (onSuccess) {
          onSuccess(action, client);
        } else {
          navigate("/clients");
        }
      };

    try {
      void save(formData).then(onSaved).catch((error: Error) => setFormError(error.message));
    } catch (error) {
      setFormError((error as Error).message);
    }
  };

  const countries = getCountries();
  const states = formData.country ? getStatesByCountry(formData.country) : [];
  const cities =
    formData.country && formData.state
      ? getCitiesByCountryAndState(formData.country, formData.state)
      : [];
  const postalCodeOptions = getPostalCodesByLocation(
    formData.country || undefined,
    formData.state || undefined,
    formData.city || undefined,
  );
  const coloniaOptions = getColoniasByLocation(
    formData.country || undefined,
    formData.state || undefined,
    formData.city || undefined,
    formData.postal_code || undefined,
  );

  return {
    formData,
    priceLists,
    avatarFileError,
    formError,
    countries,
    states,
    cities,
    postalCodeOptions,
    coloniaOptions,
    isLoading,
    isSaving,
    handleChange,
    handleAvatarFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled,
  };
}
