import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { usePortalSession } from '../../features/auth/hooks/usePortalSession';
import { LoadingState } from './LoadingState';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = usePortalSession();

  if (session.isLoading) {
    return <LoadingState />;
  }

  if (!session.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
