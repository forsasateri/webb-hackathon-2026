import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Tabs, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export const LoginPage = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // If already authenticated, redirect
  if (isAuthenticated) {
    navigate('/courses', { replace: true });
    return null;
  }

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Login successful!');
      navigate('/courses');
    } catch (err: any) {
      message.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.username, values.email, values.password);
      message.success('Registration successful! You are now logged in.');
      navigate('/courses');
    } catch (err: any) {
      message.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      await login('testuser1', 'password123');
      message.success('Dev login successful!');
      navigate('/courses');
    } catch (err: any) {
      message.error(err.message || 'Dev login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <Form onFinish={handleLogin} layout="vertical" size="large">
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Please enter your username' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please enter your password' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Login
        </Button>
      </Form.Item>
    </Form>
  );

  const registerForm = (
    <Form onFinish={handleRegister} layout="vertical" size="large">
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Please enter a username' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Please enter your email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="Email" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Please enter a password' },
          { min: 6, message: 'Password must be at least 6 characters' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Register
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <Title level={2} style={{
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: "var(--font-display, 'Orbitron', monospace)",
        letterSpacing: '0.05em',
      }}>
        Welcome
      </Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        Login or register to manage your courses
      </Text>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            { key: 'login', label: 'Login', children: loginForm },
            { key: 'register', label: 'Register', children: registerForm },
          ]}
        />

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">— or —</Text>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleDevLogin}
              loading={loading}
              block
              style={{
                background: 'rgba(0, 240, 255, 0.08)',
                borderColor: 'rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
              }}
            >
              Dev Login (testuser1)
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};
