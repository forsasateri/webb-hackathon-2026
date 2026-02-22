import { Layout, Menu, Button, Space, Typography } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  BookOutlined,
  SelectOutlined,
  RiseOutlined,
  PlusCircleOutlined,
  BarChartOutlined,
  ScheduleOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header } = Layout;
const { Text } = Typography;

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Home</Link>
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: <Link to="/courses">All Courses</Link>
    },
    {
      key: '/tiers',
      icon: <RiseOutlined />,
      label: <Link to="/tiers">Course Tiers</Link>
    },
    {
      key: '/battle',
      icon: <ThunderboltOutlined />,
      label: <Link to="/battle">Course Battle</Link>
    },
    {
      key: '/selection',
      icon: <SelectOutlined />,
      label: <Link to="/selection">Course Selection</Link>
    },
    ...(isAuthenticated
      ? [
          {
            key: '/schedule',
            icon: <ScheduleOutlined />,
            label: <Link to="/schedule">My Schedule</Link>,
          },
        ]
      : []),
    {
      key: '/grade',
      icon: <BarChartOutlined />,
      label: <Link to="/grade">Grade</Link>
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        width: '100%',
        padding: '0 40px',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 1px 0 rgba(0, 240, 255, 0.1), 0 4px 30px rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid rgba(0, 240, 255, 0.08)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginRight: 40,
          fontFamily: "var(--font-display, 'Orbitron', monospace)",
          color: '#00f0ff',
          textShadow: '0 0 10px rgba(0, 240, 255, 0.5), 0 0 30px rgba(0, 240, 255, 0.2)',
          letterSpacing: '0.05em',
        }}
      >
        CYBERSAM
      </div>

      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{
          flex: 1,
          borderBottom: 'none',
          background: 'transparent'
        }}
      />

      <Space size="middle" style={{ marginLeft: 'auto' }}>
        {isAuthenticated ? (
          <>
            <Text strong style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0, 240, 255, 0.4)' }}>
              <UserOutlined /> {user?.username}
            </Text>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="small"
            >
              Logout
            </Button>
          </>
        ) : (
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
            size="small"
          >
            Login
          </Button>
        )}
        <Link to="/debug">
          <Button icon={<PlusCircleOutlined />} size="small">
            Debug
          </Button>
        </Link>
      </Space>
    </Header>
  );
};