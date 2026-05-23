import { Box, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material';

interface SettingsPageProps {
  themePreference: 'light' | 'dark' | 'system';
  onThemePreferenceChange: (themePreference: 'light' | 'dark' | 'system') => void;
}

export default function SettingsPage({
  themePreference,
  onThemePreferenceChange,
}: SettingsPageProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Configuración
      </Typography>

      <Paper sx={{ p: 2, maxWidth: 420 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="settings-theme-mode-select-label">Tema</InputLabel>
          <Select
            labelId="settings-theme-mode-select-label"
            value={themePreference}
            label="Tema"
            onChange={(event) =>
              onThemePreferenceChange(event.target.value as 'light' | 'dark' | 'system')
            }
          >
            <MenuItem value="light">Claro</MenuItem>
            <MenuItem value="dark">Oscuro</MenuItem>
            <MenuItem value="system">Sistema</MenuItem>
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
}
