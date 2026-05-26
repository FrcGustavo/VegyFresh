import { Navigate, createBrowserRouter } from 'react-router';
import { AuthLayout } from '../layouts/AuthLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { SetupPasswordPage } from '../features/auth/pages/SetupPasswordPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { OrdersPage } from '../features/orders/pages/OrdersPage';
import { CreateOrderPage } from '../features/orders/pages/CreateOrderPage';
import { OrderDetailPage } from '../features/orders/pages/OrderDetailPage';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/setup-password', element: <SetupPasswordPage /> },
    ],
  },
  {
    path: '/portal',
    element: (
      <ProtectedRoute>
        <PortalLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/portal/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <CreateOrderPage /> },
      { path: 'orders/:orderId', element: <OrderDetailPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/portal/dashboard" replace />,
  },
]);
