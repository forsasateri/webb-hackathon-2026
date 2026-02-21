import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined, BookOutlined, SelectOutlined, RiseOutlined } from '@ant-design/icons';

const { Header } = Layout;

export const Navbar = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Home</Link>,
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: <Link to="/courses">All Courses</Link>,
    },
    {
      key: '/selection',
      icon: <SelectOutlined />,
      label: <Link to="/selection">Course Selection</Link>,
    },
    {
      key: '/grade',
      icon: <SelectOutlined />,
      label: <Link to="/grade">Grade</Link>,
    },
    {
      key: '/tiers',
      icon: <RiseOutlined />,
      label: <Link to="/tiers">Course Tiers</Link>,
    },
  ];

  return (
    <Header style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%', padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginLeft: '24px', marginRight: '48px' }}>
          Better LISAM
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
    </Header>
  );
};
