import { Box, CssBaseline, AppBar, Toolbar, Typography, Container } from '@mui/material';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Administración VegyFresh
          </Typography>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar /> {/* Spacer para el AppBar */}
        <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
          <Breadcrumbs />
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
