import { Navigate } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '../App';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export default function AuthRedirect({ children }: AuthRedirectProps) {
  const isAuthenticated = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
