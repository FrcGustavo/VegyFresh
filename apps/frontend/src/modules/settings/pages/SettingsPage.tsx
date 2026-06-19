import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import {
  useThemePreferenceStore,
  type ThemePreference,
} from "../../../theme/useThemePreferenceStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const themePreference = useThemePreferenceStore(
    (state) => state.themePreference,
  );
  const setThemePreference = useThemePreferenceStore(
    (state) => state.setThemePreference,
  );

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
              setThemePreference(event.target.value as ThemePreference)
            }
          >
            <MenuItem value="light">Claro</MenuItem>
            <MenuItem value="dark">Oscuro</MenuItem>
            <MenuItem value="system">Sistema</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 2, maxWidth: 420, mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Organización
        </Typography>
        <Button variant="contained" onClick={() => navigate("/organization")}>
          Editar organización
        </Button>
      </Paper>
    </Box>
  );
}
