import { useState } from 'react';
import { Button, Card, Input, message, Typography } from 'antd';
import { useAuthStore } from '../../store/useAuthStore'; // 注意路径
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = () => {
    const success = login(username, password);

    if (!success) {
      message.error('账号或密码错误 (试试 admin/123456)');
      return;
    }

    message.success(`登录成功！欢迎 ${username}`);

    // 🚀 根据角色跳转不同首页
    if (username === 'admin') {
      navigate('/designer');
    } else {
      navigate('/apply');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card title="登录 EnterpriseFlow" style={{ width: 380, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            管理员账号: admin / 123456
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            员工账号: user / 123456
          </Text>
        </div>

        <Input
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          size="large"
          style={{ marginBottom: 16 }}
        />
        <Input.Password
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="large"
          style={{ marginBottom: 24 }}
        />

        <Button type="primary" block size="large" onClick={handleLogin}>
          登 录
        </Button>
      </Card>
    </div>
  );
}