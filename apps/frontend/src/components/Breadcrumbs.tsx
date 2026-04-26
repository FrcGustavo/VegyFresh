import { Breadcrumbs as MUIBreadcrumbs, Link, Typography, Box, IconButton } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { NavigateNext as NavigateNextIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const breadcrumbNameMap: { [key: string]: string } = {
  '/orders': 'Pedidos',
  '/orders/create': 'Crear Pedido',
  '/products': 'Productos',
  '/products/create': 'Crear Producto',
  '/price-lists': 'Listas de Precios',
  '/price-lists/create': 'Crear Lista',
  '/clients': 'Clientes',
  '/clients/create': 'Crear Cliente',
  '/suppliers': 'Proveedores',
  '/suppliers/create': 'Crear Proveedor',
  '/users': 'Usuarios y Roles',
  '/users/create': 'Crear Usuario',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (location.pathname === '/') return null;

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <IconButton onClick={() => navigate(-1)} size="small" color="primary">
        <ArrowBackIcon />
      </IconButton>
      <MUIBreadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        <Link component={RouterLink} underline="hover" color="inherit" to="/">
          Inicio
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;

          const isId = value.length > 20;
          const name = isId ? 'Detalle' : (breadcrumbNameMap[to] || value.charAt(0).toUpperCase() + value.slice(1));

          return last ? (
            <Typography color="text.primary" key={to}>
              {name === 'Edit' ? 'Editar' : name}
            </Typography>
          ) : (
            <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
              {name}
            </Link>
          );
        })}
      </MUIBreadcrumbs>
    </Box>
  );
}
