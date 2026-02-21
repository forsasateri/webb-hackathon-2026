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
    },
    {
      key: '/tiers',
      icon: <RiseOutlined />,
      label: <Link to="/tiers">Course Tiers</Link>
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
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginRight: 40,
          color: '#111827'
        }}
      >
        Better LISAM
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
            <Text strong style={{ color: '#1677ff' }}>
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