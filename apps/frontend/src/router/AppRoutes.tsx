import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import MainLayout from "../layout/MainLayout";
import { canAccessUsersResource } from "../auth/authorization";
import {
  HomeRedirect,
  OrganizationRoute,
  ProtectedRoute,
  RoleProtectedRoute,
} from "./RouteGuards";

const OrdersList = lazy(() => import("../modules/orders/pages/OrdersList"));
const ProductsList = lazy(
  () => import("../modules/products/pages/ProductsList"),
);
const PurchasesList = lazy(
  () => import("../modules/purchases/pages/PurchasesList"),
);
const PriceListsList = lazy(
  () => import("../modules/products/pages/PriceListsList"),
);
const ClientsList = lazy(() => import("../modules/clients/pages/ClientsList"));
const SuppliersList = lazy(
  () => import("../modules/suppliers/pages/SuppliersList"),
);
const UsersList = lazy(() => import("../modules/users/pages/UsersList"));
const OrganizationPage = lazy(
  () => import("../modules/organization/pages/OrganizationPage"),
);
const InventoryPage = lazy(
  () => import("../modules/inventory/pages/InventoryPage"),
);
const SettingsPage = lazy(
  () => import("../modules/settings/pages/SettingsPage"),
);
const LoginPage = lazy(() => import("../modules/auth/pages/LoginPage"));
const SignupPage = lazy(() => import("../modules/auth/pages/SignupPage"));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="price-lists" element={<PriceListsList />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route
          path="users"
          element={
            <RoleProtectedRoute canAccess={canAccessUsersResource}>
              <UsersList />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="organization"
          element={
            <OrganizationRoute>
              <OrganizationPage />
            </OrganizationRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
