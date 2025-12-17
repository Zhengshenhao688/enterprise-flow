import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Result } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  allowedRoles?: ('admin' | 'user')[]; 
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const location = useLocation();

  // 1. 尚未登录 -> 重定向到登录页
  if (!token) {
    // state={{ from: location }} 用于登录后跳回之前的页面（可选优化）
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. 角色权限校验
  // 如果当前路由限制了角色，且当前用户角色不在允许列表中
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面 (仅管理员可见)。"
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              返回上一页
            </Button>
          }
        />
      </div>
    );
  }

  // 3. 校验通过，渲染子组件
  return <>{children}</>;
}