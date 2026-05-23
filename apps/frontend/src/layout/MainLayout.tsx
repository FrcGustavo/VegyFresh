import { Box, CssBaseline, AppBar, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} elevation={0}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Administración VegyFresh
          </Typography>
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
