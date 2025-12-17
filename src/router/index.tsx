import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../components/Layout";
import Login from "../pages/Login";
import Designer from "../pages/Designer";
import Approval from "../pages/Approval";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import ApplyPage from "../pages/Apply";
import ApprovalDetailPage from "../pages/ApprovalDetail";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    // 最外层守卫：确保所有子路由都必须登录
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/", 
        element: <Navigate to="/apply" replace /> 
      },
      // 🔒 仅管理员可访问
      { 
        path: "designer", 
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Designer />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "approval", 
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Approval />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "approval/:instanceId", 
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <ApprovalDetailPage />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "dashboard", 
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        ) 
      },

      // 🌍 普通员工 + 管理员均可访问
      { path: "apply", element: <ApplyPage /> },
    ],
  },
]);

export default router;