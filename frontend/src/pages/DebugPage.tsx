import { Layout, Typography, Button, Space } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export const DebugPage = () => {

    return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <Title level={1} style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Debug Page</Title>
        <Paragraph style={{ fontSize: '18px', marginBottom: '40px', color: 'var(--text-secondary)' }}>
          Tools for quick testing and setting state
        </Paragraph>
        <Space size="large">
          
          <Button
            type="primary"
            size="large"
            onClick={() => console.log('Reset User State')}
          >
            Reset user state
          </Button>

          <Button
            type="primary"
            size="large"
            onClick={() => console.log('Assign Random Courses')}
          >
            Assign Random Courses
          </Button>
          
        </Space>
        
      </div>
    </Content>
  );
}