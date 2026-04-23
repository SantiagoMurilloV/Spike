import { Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AppRole = 'super_admin' | 'admin' | 'judge' | 'team_captain';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Restrict access to users with one of the given roles. Users signed in
   * with a different role get bounced to the route that matches their role
   * (admins → /admin, judges → /judge, team_captains → /team-panel) so
   * they don't see someone else's chrome.
   */
  allowedRoles?: Array<AppRole>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Cargando sesión"
        className="min-h-screen flex items-center justify-center bg-white"
      >
        <Loader2 className="w-8 h-8 animate-spin text-spk-red" aria-hidden="true" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as AppRole)) {
    // Wrong role → send them to their own home rather than showing a
    // "not found" page.
    const fallback =
      user.role === 'super_admin'
        ? '/super-admin'
        : user.role === 'admin'
          ? '/admin'
          : user.role === 'judge'
            ? '/judge'
            : user.role === 'team_captain'
              ? '/team-panel'
              : '/login';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
