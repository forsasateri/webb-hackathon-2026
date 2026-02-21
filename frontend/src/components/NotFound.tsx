import { Layout, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Content } = Layout;
const { Title } = Typography;

interface NotFoundProps {
  message?: string;
  backToText?: string;
  backToPath?: string;
}

export const NotFound = ({ 
  message = 'Course Not Found', 
  backToText = 'Back to All Courses',
  backToPath = '/courses'
}: NotFoundProps) => {
  const navigate = useNavigate();

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <Title level={2} style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{message}</Title>
        <Button type="primary" onClick={() => navigate(backToPath)}>{backToText}</Button>
      </div>
    </Content>
  );
};
