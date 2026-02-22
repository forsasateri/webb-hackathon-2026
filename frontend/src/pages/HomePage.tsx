import { Layout, Typography, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BookOutlined, SelectOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { PanicButton } from '../components/PanicButton';

const { Content } = Layout;
const { Paragraph } = Typography;

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Content style={{ padding: '20px 50px 50px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>

        {/* Glitch hero title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1
            className="glitch"
            data-text="CYBER LISAM"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontFamily: "var(--font-display, 'Orbitron', monospace)",
              color: '#e2e8f0',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            CYBER LISAM
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Paragraph
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              marginBottom: 40,
              letterSpacing: '0.02em',
            }}
          >
            Survive the system. Choose your destiny.
          </Paragraph>
        </motion.div>

        {/* CTA buttons with stagger */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Space size="large" wrap>
            <Button
              className="cta-breathing"
              size="large"
              type="primary"
              icon={<BookOutlined />}
              onClick={() => navigate('/courses')}
              style={{
                height: 48,
                borderRadius: 12,
                padding: '0 28px',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Browse All Courses
            </Button>

            <Button
              size="large"
              icon={<SelectOutlined />}
              onClick={() => navigate('/selection')}
              style={{
                height: 48,
                borderRadius: 12,
                padding: '0 28px',
                fontWeight: 600,
                fontSize: 15,
                background: 'rgba(176, 38, 255, 0.15)',
                borderColor: 'rgba(176, 38, 255, 0.4)',
                color: '#b026ff',
              }}
            >
              Spin the Wheel
            </Button>

            <Button
              size="large"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/battle')}
              style={{
                height: 48,
                borderRadius: 12,
                padding: '0 28px',
                fontWeight: 600,
                fontSize: 15,
                background: 'rgba(255, 0, 60, 0.12)',
                borderColor: 'rgba(255, 0, 60, 0.35)',
                color: '#ff003c',
              }}
            >
              Course Battle
            </Button>
          </Space>
        </motion.div>
      </div>

      {/* Panic Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{ maxWidth: '800px', margin: '60px auto 0', textAlign: 'center' }}
      >
        <PanicButton />
      </motion.div>
    </Content>
  );
};
