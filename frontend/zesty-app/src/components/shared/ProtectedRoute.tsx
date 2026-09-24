import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { getPostAuthRedirectPath } from '../../utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Only this role may open the page; everyone else goes to their own dashboard. */
  requiredRole?: string;
  /** Customer-only pages (the customer hub): business accounts go to their own dashboard. */
  customerOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, customerOnly }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee]" aria-busy="true">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#141414]/15 border-t-[#141414]" />
          <p className="text-sm text-[#6b6a63]">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember the page (path + query) so sign-in can return here. Login
    // only honours it for ordinary pages, never for dashboards.
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from }} replace />;
  }

  // Each role has one home. Opening another role's dashboard (an old link, a
  // bookmark, the back button after switching accounts) goes straight there
  // instead of stopping on a "not allowed" screen.
  const home = getPostAuthRedirectPath(user?.role);
  const wrongRole = requiredRole ? user?.role !== requiredRole : customerOnly ? user?.role !== 'customer' : false;
  if (wrongRole && location.pathname !== home) {
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};
