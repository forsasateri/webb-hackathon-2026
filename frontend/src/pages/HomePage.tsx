import { Layout, Typography, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BookOutlined, SelectOutlined } from '@ant-design/icons';

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
            type="primary"
            size="large"
            icon={<BookOutlined />}
            onClick={() => navigate('/courses')}
          >
            Browse All Courses
          </Button>
          <Button
            size="large"
            icon={<SelectOutlined />}
            onClick={() => navigate('/selection')}
          >
            Course Selection
          </Button>
        </Space>
      </div>
    </Content>
  );
};
