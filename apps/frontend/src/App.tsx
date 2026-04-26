import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider, createTheme } from '@mui/material';
import MainLayout from './layout/MainLayout';

// Pedidos
import OrdersList from './modules/orders/pages/OrdersList';
import OrdersCreate from './modules/orders/pages/OrdersCreate';
import OrdersEdit from './modules/orders/pages/OrdersEdit';
import OrdersDetail from './modules/orders/pages/OrdersDetail';

// Productos
import ProductsList from './modules/products/pages/ProductsList';
import ProductsCreate from './modules/products/pages/ProductsCreate';
import ProductsEdit from './modules/products/pages/ProductsEdit';
import ProductsDetail from './modules/products/pages/ProductsDetail';

// Listas de Precios (ahora dentro de productos)
import PriceListsList from './modules/products/price-lists/pages/PriceListsList';
import PriceListsCreate from './modules/products/price-lists/pages/PriceListsCreate';
import PriceListsEdit from './modules/products/price-lists/pages/PriceListsEdit';

// Clientes
import ClientsList from './modules/clients/pages/ClientsList';
import ClientsCreate from './modules/clients/pages/ClientsCreate';
import ClientsEdit from './modules/clients/pages/ClientsEdit';
import ClientsDetail from './modules/clients/pages/ClientsDetail';

// Proveedores
import SuppliersList from './modules/suppliers/pages/SuppliersList';
import SuppliersCreate from './modules/suppliers/pages/SuppliersCreate';
import SuppliersEdit from './modules/suppliers/pages/SuppliersEdit';
import SuppliersDetail from './modules/suppliers/pages/SuppliersDetail';

// Usuarios
import UsersList from './modules/users/pages/UsersList';
import UsersCreate from './modules/users/pages/UsersCreate';
import UsersEdit from './modules/users/pages/UsersEdit';
import UsersDetail from './modules/users/pages/UsersDetail';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // VegyFresh Green
    },
    secondary: {
      main: '#f57c00', // Orange
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/orders" replace />} />
            
            {/* Pedidos */}
            <Route path="orders" element={<OrdersList />} />
            <Route path="orders/create" element={<OrdersCreate />} />
            <Route path="orders/:id" element={<OrdersDetail />} />
            <Route path="orders/:id/edit" element={<OrdersEdit />} />

            {/* Productos */}
            <Route path="products" element={<ProductsList />} />
            <Route path="products/create" element={<ProductsCreate />} />
            <Route path="products/:id" element={<ProductsDetail />} />
            <Route path="products/:id/edit" element={<ProductsEdit />} />

            {/* Listas de Precios */}
            <Route path="price-lists" element={<PriceListsList />} />
            <Route path="price-lists/create" element={<PriceListsCreate />} />
            <Route path="price-lists/:id/edit" element={<PriceListsEdit />} />

            {/* Clientes */}
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/create" element={<ClientsCreate />} />
            <Route path="clients/:id" element={<ClientsDetail />} />
            <Route path="clients/:id/edit" element={<ClientsEdit />} />

            {/* Proveedores */}
            <Route path="suppliers" element={<SuppliersList />} />
            <Route path="suppliers/create" element={<SuppliersCreate />} />
            <Route path="suppliers/:id" element={<SuppliersDetail />} />
            <Route path="suppliers/:id/edit" element={<SuppliersEdit />} />

            {/* Usuarios */}
            <Route path="users" element={<UsersList />} />
            <Route path="users/create" element={<UsersCreate />} />
            <Route path="users/:id" element={<UsersDetail />} />
            <Route path="users/:id/edit" element={<UsersEdit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
