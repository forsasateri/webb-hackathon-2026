import { Layout, Typography, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BookOutlined, SelectOutlined } from '@ant-design/icons';
import { PanicButton } from '../components/PanicButton';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <Title level={1}>Welcome to the New Lisam</Title>
        <Paragraph style={{ fontSize: '18px', marginBottom: '40px' }}>
          Built with style and mostly working
        </Paragraph>
        <Space size="large">
          <Button
            size="large"
            icon={<BookOutlined />}
            onClick={() => navigate('/courses')}
            style={{
              background: '#E6F6F8',
              borderColor: '#4FA9B7',
              color: '#2F6F79',
              borderWidth: 2,
              borderRadius: 12,
              padding: '0 24px'
            }}
          >
            Browse All Courses
          </Button>

          <Button
            size="large"
            icon={<SelectOutlined />}
            onClick={() => navigate('/selection')}
            style={{
              background: '#E6F6F8',
              borderColor: '#4FA9B7',
              color: '#2F6F79',
              borderWidth: 2,
              borderRadius: 12,
              padding: '0 24px'
            }}
          >
            Course Selection
          </Button>
        </Space>
      </div>


       <div style={{ maxWidth: '800px', margin: '50px', textAlign: 'center' }}>
        <PanicButton />
      </div>
    </Content>
  );
};
