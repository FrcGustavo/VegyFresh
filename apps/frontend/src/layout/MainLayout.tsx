import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        elevation={0}
      >
        <Toolbar>
          <Box sx={{ fontWeight: 600, fontSize: '1.2rem', color: 'text' }}>
            VegyFresh
          </Box>
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
          bgcolor: 'background.paper',
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
