import React from 'react';
import { Layout, Menu, Button, theme, Typography, Space, Avatar, message, Tag } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppstoreOutlined, 
  FormOutlined, 
  AuditOutlined, 
  UserOutlined, 
  LogoutOutlined,
  DashboardOutlined 
} from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/apply',
      icon: <FormOutlined />,
      label: '发起申请',
    },
    ...(role === 'admin' ? [
      {
        key: '/approval',
        icon: <AuditOutlined />,
        label: '审批中心',
      },
      {
        key: '/designer',
        icon: <AppstoreOutlined />,
        label: '流程设计器',
      },
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '数据看板',
      }
    ] : [])
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ✅ 修改点 1: Sider 主题改为 'light'，并设置背景色为白色 
        去掉了 breakpoint 和 collapsedWidth 以保持始终展开（根据需要可恢复）
      */}
      <Sider theme="light" style={{ background: colorBgContainer, borderRight: '1px solid #f0f0f0' }}>
        {/* Logo 区域标题颜色改为黑色 */}
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title level={5} style={{ color: '#000', margin: 0 }}> {/* 颜色改成黑色 */}
            EnterpriseFlow
          </Title>
        </div>
        {/* ✅ 修改点 2: Menu 主题改为 'light' */}
        <Menu
          theme="light" // 主题改为 light
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={(item) => navigate(item.key)}
          style={{ borderRight: 0 }} // 去掉 Menu 自带的右边框，使用 Sider 的
        />
      </Sider>

      <Layout>
        {/* Header 保持不变，依然是白色背景 */}
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 16 }}>
            工作台
          </Text>

          <Space size="large">
            <Space>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: role === 'admin' ? '#1890ff' : '#87d068' }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Text style={{ fontSize: 12 }}>当前用户</Text>
                <Tag color={role === 'admin' ? 'blue' : 'green'} style={{ margin: 0, fontSize: 10, lineHeight: '16px', textAlign: 'center' }}>
                  {role === 'admin' ? '管理员' : '普通员工'}
                </Tag>
              </div>
            </Space>

            <Button 
              type="text" // 改为 text 类型，视觉更清爽
              danger 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
            >
              退出
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>

        <Layout.Footer style={{ textAlign: 'center', color: '#999' }}>
          EnterpriseFlow ©{new Date().getFullYear()} Created by React & Zustand
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;