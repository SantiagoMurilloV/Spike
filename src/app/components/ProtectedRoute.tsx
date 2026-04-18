import { Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Cargando sesión"
        className="min-h-screen flex items-center justify-center bg-white"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#E31E24]" aria-hidden="true" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
