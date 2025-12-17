import { Layout, Menu } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();

  const menuItems = [
    { key: '/designer', label: '流程设计器' },
    { key: '/approval', label: '审批中心' },
    { key: '/dashboard', label: '数据看板' },
    { key: '/apply', label: '发起申请' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧菜单 */}
      <Sider theme="light">
        <Menu
          mode="inline"
          items={menuItems}
          onClick={(item) => navigate(item.key)}
        />
      </Sider>

      {/* 右侧主体内容 */}
      <Layout>
        <Header style={{ background: '#fff', paddingLeft: 20 }}>
          <h2>EnterpriseFlow 流程协作平台</h2>
        </Header>
        <Content style={{ margin: 20, background: '#fff', padding: 20 }}>
          {/* 用于渲染子路由 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}