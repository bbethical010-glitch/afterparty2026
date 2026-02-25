import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }) {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (isChecking) {
    return <div className="boxed shadow-panel p-4 text-sm">Validating session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
