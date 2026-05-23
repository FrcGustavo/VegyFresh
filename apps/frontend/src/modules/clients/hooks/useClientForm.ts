import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { fetchApi } from '../../../api';
import {
  findLocationByPostalCode,
  getCitiesByCountryAndState,
  getColoniasByLocation,
  getCountries,
  getPostalCodesByLocation,
  getStatesByCountry,
} from '../constants/locationCatalog';

type SaveAction = 'save' | 'save-and-close' | 'save-and-new';
type ClientChangeEvent = { target: { name: string; value: string } };
interface ClientFormData {
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
interface PriceListOption {
  id: string;
  name: string;
}
const EMPTY_CLIENT_FORM: ClientFormData = {
  name: '',
  phone_number: '',
  email: '',
  country: '',
  state: '',
  city: '',
  postal_code: '',
  address: '',
  suburb: '',
  external_number: '',
  internal_number: '',
  avatar_url: '',
  price_list_id: '',
};

export function useClientForm(id?: string, onSuccess?: (action: SaveAction) => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ClientFormData>(EMPTY_CLIENT_FORM);
  const [isDisabled, setIsDisabled] = useState(!!id);

  const { data: existingClient, isLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => fetchApi(`/clients/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingClient) {
      queueMicrotask(() => {
        setFormData({
          name: existingClient.name,
          phone_number: existingClient.phone_number,
          email: existingClient.email || '',
          country: existingClient.country || '',
          state: existingClient.state || '',
          city: existingClient.city || '',
          postal_code: existingClient.postal_code || '',
          address: existingClient.address || '',
          suburb: existingClient.suburb || '',
          external_number: existingClient.external_number || '',
          internal_number: existingClient.internal_number || '',
          avatar_url: existingClient.avatar_url || '',
          price_list_id: existingClient.price_list_id || '',
        });
      });
    } else if (!id) {
      queueMicrotask(() => {
        setFormData(EMPTY_CLIENT_FORM);
      });
    }
  }, [id, existingClient]);

  const { data: priceListsData } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });
  const priceLists = (Array.isArray(priceListsData) ? priceListsData : (priceListsData?.data || [])) as PriceListOption[];

  const handleChange = (e: ClientChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'country') {
        next.state = '';
        next.city = '';
        next.suburb = '';
      }

      if (name === 'state') {
        next.city = '';
        next.suburb = '';
      }

      if (name === 'city') {
        next.suburb = '';
      }

      if (name === 'postal_code') {
        const locationMatch = findLocationByPostalCode(String(value));
        if (locationMatch) {
          next.country = locationMatch.country;
          next.state = locationMatch.state;
          next.city = locationMatch.city;
          next.suburb = locationMatch.colonias.length === 1 ? locationMatch.colonias[0] : '';
        }
      }

      return next;
    });
  };

  const handleAvatarFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, avatar_url: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (data: ClientFormData) => fetchApi(id ? `/clients/${id}` : '/clients', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  const handleSubmit = (action: SaveAction = 'save') => {
    mutation.mutate(formData, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess(action);
        } else {
          navigate('/clients');
        }
      }
    });
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
    countries,
    states,
    cities,
    postalCodeOptions,
    coloniaOptions,
    isLoading,
    isSaving: mutation.isPending,
    handleChange,
    handleAvatarFileChange,
    handleSubmit,
    isDisabled,
    setIsDisabled
  };
}
