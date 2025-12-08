import { useState } from 'react';
import { Button, Card, Input, message } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = () => {
    const ok = login(username, password);

    if (!ok) {
      message.error('账号或密码错误');
      return;
    }

    // 登录成功跳转 designer
    message.success('登录成功');
    navigate('/designer');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card title="登录 EnterpriseFlow" style={{ width: 350 }}>
        <Input
          placeholder="用户名：admin 或 user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          placeholder="密码：123456"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <Button type="primary" block onClick={handleLogin}>
          登录
        </Button>
      </Card>
    </div>
  );
}