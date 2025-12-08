import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/Layout';
import Login from '../pages/Login';
import Designer from '../pages/Designer';
import Approval from '../pages/Approval';
import Dashboard from '../pages/Dashboard';
import ProtectedRoute from './ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'designer', element: <Designer /> },
      { path: 'approval', element: <Approval /> },
      { path: 'dashboard', element: <Dashboard /> },
    ],
  },
]);

export default router;