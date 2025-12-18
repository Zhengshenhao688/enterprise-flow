import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../components/Layout";
import Login from "../pages/Login";
import Designer from "../pages/Designer";
import Approval from "../pages/Approval";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import ApplyPage from "../pages/Apply";
import ApprovalDetailPage from "../pages/ApprovalDetail";
import MyApplications from "../pages/MyApplications";

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
      
      // 🔒 1. 依然仅管理员可访问 (设计器 & 仪表盘)
      { 
        path: "designer", 
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Designer />
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

      // 🔓 2. 解锁审批中心：所有人均可访问 (内部会根据角色过滤数据)
      { 
        path: "approval", 
        element: (
          <ProtectedRoute> 
            <Approval />
          </ProtectedRoute>
        ) 
      },
      { 
        path: '/approval-detail/:instanceId', 
        element: (
          <ProtectedRoute>
            <ApprovalDetailPage />
          </ProtectedRoute>
        ) 
      },

      // 🌍 3. 所有人可访问 (发起页)
      { path: "apply", element: <ApplyPage /> },

      // 🌍 4. 我发起的申请（user / admin 使用，菜单层已控制角色）
      {
        path: "my-applications",
        element: (
          <ProtectedRoute>
            <MyApplications />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;