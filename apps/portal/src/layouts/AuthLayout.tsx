import { Box, Container, Paper } from '@mui/material';
import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 3 }}>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}
