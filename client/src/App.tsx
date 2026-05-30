import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import { TOKEN_KEY } from './api';
import { Loader2 } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventories = lazy(() => import('./pages/Inventories'));
const InventoryCategories = lazy(() => import('./pages/InventoryCategories'));
const CategoryItems = lazy(() => import('./pages/CategoryItems'));
const Items = lazy(() => import('./pages/Items'));

export const AUTH_TOKEN_KEY = TOKEN_KEY;
export const DEMO_EMAIL = 'demo@invvy.app';

function RouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
        <Loader2 size={18} className="animate-spin" />
        Loading page
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthRedirect>
              <Login />
            </AuthRedirect>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRedirect>
              <Register />
            </AuthRedirect>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventories" element={<Inventories />} />
            <Route path="inventories/:invId" element={<InventoryCategories />} />
            <Route path="inventories/:invId/:catId" element={<CategoryItems />} />
            <Route path="items" element={<Items />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
