import { useState } from 'react';
import { Button, Card, Input, message, Typography,  Tag } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, KeyOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = () => {
    const success = login(username, password);

    if (!success) {
      message.error('密码错误 (统一密码: 123456)');
      return;
    }

    message.success(`登录成功！当前角色: ${username}`);

    if (username === 'admin') {
      navigate('/designer');
    } else {
      navigate('/approval'); // 普通角色直接去审批中心看任务
    }
  };

  // 辅助函数：快速填充账号
  const quickFill = (role: string) => {
    setUsername(role);
    setPassword('123456');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>EnterpriseFlow</Title>
          <Text type="secondary">企业级流程协作平台</Text>
        </div>

        <Input
          prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="用户名 / 角色"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          size="large"
          style={{ marginBottom: 16 }}
        />
        <Input.Password
          prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="密码 (123456)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="large"
          style={{ marginBottom: 24 }}
        />

        <Button type="primary" block size="large" onClick={handleLogin} style={{ marginBottom: 24 }}>
          登 录
        </Button>

        {/* 👇 新增：快速角色切换区域 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>⚡️ 快速演示账号 (点击切换):</Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => quickFill('admin')}>管理员 (Admin)</Tag>
            <Tag color="orange" style={{ cursor: 'pointer' }} onClick={() => quickFill('manager')}>经理 (Manager)</Tag>
            <Tag color="green" style={{ cursor: 'pointer' }} onClick={() => quickFill('hr')}>人事 (HR)</Tag>
            <Tag color="cyan" style={{ cursor: 'pointer' }} onClick={() => quickFill('finance')}>财务 (Finance)</Tag>
            <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => quickFill('user')}>普通用户 (User)</Tag>
          </div>
        </div>
      </Card>
    </div>
  );
}