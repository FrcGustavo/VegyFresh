import { Box, CssBaseline, AppBar, Toolbar, Typography, Container, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  themePreference: 'light' | 'dark' | 'system';
  onThemePreferenceChange: (themePreference: 'light' | 'dark' | 'system') => void;
}

export default function MainLayout({ themePreference, onThemePreferenceChange }: MainLayoutProps) {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" noWrap component="div">
            Administración VegyFresh
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150, ml: 'auto' }}>
            <InputLabel id="theme-mode-select-label" sx={{ color: 'common.white' }}>Tema</InputLabel>
            <Select
              labelId="theme-mode-select-label"
              value={themePreference}
              label="Tema"
              onChange={(event) => onThemePreferenceChange(event.target.value as 'light' | 'dark' | 'system')}
              sx={{
                color: 'common.white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'common.white' },
                '& .MuiSvgIcon-root': { color: 'common.white' },
              }}
            >
              <MenuItem value="light">Claro</MenuItem>
              <MenuItem value="dark">Oscuro</MenuItem>
              <MenuItem value="system">Sistema</MenuItem>
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          px: 0,
          pt: { xs: 'calc(56px)', sm: 'calc(64px)' },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Box>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
