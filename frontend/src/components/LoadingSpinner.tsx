import { Layout, Spin } from 'antd';

const { Content } = Layout;

export const LoadingSpinner = () => {
  return (
    <Content style={{ padding: '50px', textAlign: 'center' }}>
      <Spin size="large" />
    </Content>
  );
};
