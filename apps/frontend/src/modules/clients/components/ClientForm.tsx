import {
  Box,
  TextField,
  MenuItem,
  Button,
  Avatar,
  Autocomplete,
  Divider,
  Typography,
} from '@mui/material';

type ClientFormSection = 'general' | 'address' | 'price-list';
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

interface ClientFormProps {
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
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  section: ClientFormSection;
  isDisabled?: boolean;
}

export default function ClientForm({
  formData,
  priceLists,
  avatarFileError,
  countries,
  states,
  cities,
  postalCodeOptions,
  coloniaOptions,
  handleChange,
  handleAvatarFileChange,
  handleSubmit,
  section,
  isDisabled = false
}: ClientFormProps) {
  return (
    <Box>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
        {section === 'general' && (
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Box
              sx={{
                width: { xs: '100%', md: 220 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                src={formData.avatar_url || undefined}
                alt={formData.name || 'Cliente'}
                sx={{ width: 150, height: 150 }}
              >
                {(formData.name || 'C').charAt(0).toUpperCase()}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                disabled={isDisabled}
                sx={{ width: '100%' }}
              >
                Seleccionar avatar
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleAvatarFileChange(file);
                    }
                  }}
                />
              </Button>
              {avatarFileError && (
                <Typography color="error" variant="body2">
                  {avatarFileError}
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
              <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} disabled={isDisabled} />
              <TextField fullWidth label="Teléfono" name="phone_number" margin="normal" value={formData.phone_number || ''} onChange={handleChange} required disabled={isDisabled} />
            </Box>
          </Box>
        )}

        {section === 'address' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Ubicación
            </Typography>
            <Autocomplete
              freeSolo
              options={postalCodeOptions}
              value={formData.postal_code || ''}
              inputValue={formData.postal_code || ''}
              onInputChange={(_event, value) =>
                handleChange({
                  target: { name: 'postal_code', value },
                })
              }
              disabled={isDisabled}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Código postal"
                  name="postal_code"
                  helperText="Escribe el código postal para autocompletar país, estado y ciudad"
                />
              )}
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <TextField select fullWidth label="País" name="country" value={formData.country || ''} onChange={handleChange} disabled={isDisabled}>
                <MenuItem value=""><em>Selecciona un país</em></MenuItem>
                {countries.map((country) => (
                  <MenuItem key={country} value={country}>{country}</MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth label="Estado/Provincia" name="state" value={formData.state || ''} onChange={handleChange} disabled={isDisabled || !formData.country}>
                <MenuItem value=""><em>Selecciona un estado</em></MenuItem>
                {states.map((state) => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth label="Ciudad" name="city" value={formData.city || ''} onChange={handleChange} disabled={isDisabled || !formData.state}>
                <MenuItem value=""><em>Selecciona una ciudad</em></MenuItem>
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Domicilio
            </Typography>
            <TextField
              fullWidth
              label="Dirección (calle)"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              disabled={isDisabled}
              multiline
              minRows={2}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <Autocomplete
                freeSolo
                options={coloniaOptions}
                value={formData.suburb || ''}
                inputValue={formData.suburb || ''}
                onInputChange={(_event, value) =>
                  handleChange({
                    target: { name: 'suburb', value },
                  })
                }
                disabled={isDisabled}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Colonia"
                    name="suburb"
                    helperText="Puedes elegir una opción sugerida o escribir una colonia manualmente"
                  />
                )}
              />
              <TextField fullWidth label="Número exterior" name="external_number" value={formData.external_number || ''} onChange={handleChange} disabled={isDisabled} />
              <TextField fullWidth label="Número interior (opcional)" name="internal_number" value={formData.internal_number || ''} onChange={handleChange} disabled={isDisabled} />
            </Box>
          </Box>
        )}

        {section === 'price-list' && (
          <TextField select fullWidth label="Lista de Precios" name="price_list_id" margin="normal" value={formData.price_list_id || ''} onChange={handleChange} disabled={isDisabled}>
            <MenuItem value=""><em>Ninguna</em></MenuItem>
            {priceLists.map((list) => (
              <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
            ))}
          </TextField>
        )}
      </form>
    </Box>
  );
}
