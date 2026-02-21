import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  BookOutlined,
  SelectOutlined,
  RiseOutlined,
  PlusCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Header } = Layout;

export const Navbar = () => {
  const location = useLocation();

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

      <Menu mode="horizontal" style={{ borderBottom: 'none', background: 'transparent' }}>
        <Menu.Item key="debug" icon={<PlusCircleOutlined />} style={{ marginLeft: 'auto' }}>
          <Link to="/debug">Debug</Link>
        </Menu.Item>
      </Menu>
      
    </Header>
  );
};