import { Layout } from 'antd';

const { Content } = Layout;

export const LoadingSpinner = () => {
  return (
    <Content style={{ padding: '80px', textAlign: 'center' }}>
      <div className="cyber-loader" style={{ marginBottom: 16 }}>
        <div className="cyber-loader-bar" />
        <div className="cyber-loader-bar" />
        <div className="cyber-loader-bar" />
        <div className="cyber-loader-bar" />
        <div className="cyber-loader-bar" />
      </div>
      <div style={{
        fontFamily: "var(--font-display, 'Orbitron', monospace)",
        fontSize: 12,
        color: 'var(--neon-cyan, #00f0ff)',
        textShadow: '0 0 8px rgba(0, 240, 255, 0.4)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Loading...
      </div>
    </Content>
  );
};
