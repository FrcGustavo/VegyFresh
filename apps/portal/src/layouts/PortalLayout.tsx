import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { Link, Outlet, useNavigate } from 'react-router';
import { usePortalSession } from '../features/auth/hooks/usePortalSession';

export function PortalLayout() {
  const navigate = useNavigate();
  const session = usePortalSession();

  return (
    <Box>
      <AppBar position="sticky">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">VegyFresh Customer Portal</Typography>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/portal/dashboard">
              Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/portal/orders">
              Orders
            </Button>
            <Button
              color="inherit"
              onClick={async () => {
                await session.logout();
                navigate('/login', { replace: true });
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
