import { Navigate, Outlet } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '../App';

export default function ProtectedRoute() {
  const isAuthenticated = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
