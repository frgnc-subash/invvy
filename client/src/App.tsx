import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventories from './pages/Inventories';
import InventoryCategories from './pages/InventoryCategories';
import CategoryItems from './pages/CategoryItems';
import Items from './pages/Items';
import { TOKEN_KEY } from './api';

export const AUTH_TOKEN_KEY = TOKEN_KEY;
export const DEMO_EMAIL = 'demo@invvy.app';

export default function App() {
  return (
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
  );
}
