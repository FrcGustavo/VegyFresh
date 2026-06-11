import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../auth/AuthContext';
import {
  EMPTY_ORGANIZATION_FORM,
  OrganizationForm,
  type OrganizationFormData,
} from '../../organizations/components/OrganizationForm';

export default function OrganizationSetupPage() {
  const navigate = useNavigate();
  const { completeOrganization } = useAuth();

  const [formData, setFormData] = useState<OrganizationFormData>(
    EMPTY_ORGANIZATION_FORM,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (name: keyof OrganizationFormData, value: string) => {
    setFormData((current) => ({
      ...current,
      [name]: name === 'name' ? value : value.trim() ? value.trim() : null,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      await completeOrganization({
        name: formData.name.trim(),
        logo_url: formData.logo_url,
        legal_name: formData.legal_name,
        organization_email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address,
        product_folio_prefix: formData.product_folio_prefix,
        price_list_folio_prefix: formData.price_list_folio_prefix,
        order_folio_prefix: formData.order_folio_prefix,
        client_folio_prefix: formData.client_folio_prefix,
        supplier_folio_prefix: formData.supplier_folio_prefix,
        purchase_folio_prefix: formData.purchase_folio_prefix,
      });
      void navigate('/orders');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo completar la organización',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Configurar organización
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Completa los datos para activar tu cuenta.
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 960 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <OrganizationForm
          value={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
          submitLabel="Guardar organización"
          secondaryActionLabel="Ir a login"
          onSecondaryAction={() => void navigate('/login')}
        />
      </Paper>
    </Box>
  );
}
