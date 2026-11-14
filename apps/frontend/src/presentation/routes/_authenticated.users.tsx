import { createFileRoute } from "@tanstack/react-router";
import UsersList from "../users/pages/UsersList";
import { RoleProtectedRoute } from "../router/RouteGuards";
import { canAccessUsersResource } from "@/domain/auth/authorization";
export const Route = createFileRoute("/_authenticated/users")({ component: () => <RoleProtectedRoute canAccess={canAccessUsersResource}><UsersList /></RoleProtectedRoute> });
