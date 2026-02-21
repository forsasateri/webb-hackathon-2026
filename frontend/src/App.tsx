import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { Navbar } from './components';

import {
  HomePage,
  AllCoursesPage,
  CoursePage,
  CourseSelectionPage,
  GradePage,
  CourseTierListPage,
  DebugPage
} from './pages';

const { Content } = Layout;

function AppContent() {
  const location = useLocation();

  const enableTilt =
    location.pathname === '/' ||
    location.pathname === '/selection';

  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: '#80dcf3',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '120px',
          padding: '40px'
        }}
      >
        <div
          onMouseMove={
            enableTilt
              ? (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;

                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;

                  const rotateY = (x - centerX) / 200;
                  const rotateX = -(y - centerY) / 200;

                  setRotate({ x: rotateX, y: rotateY });
                }
              : undefined
          }
          onMouseLeave={
            enableTilt
              ? () => setRotate({ x: 0, y: 0 })
              : undefined
          }
          style={{
            width: '100%',
            maxWidth: '1000px',
            background: '#ffffff',
            borderRadius: 16,
            padding: '60px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            transform: enableTilt
              ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`
              : 'none',
            boxShadow: enableTilt
              ? `${-rotate.y * 2}px ${rotate.x * 2}px 40px rgba(0,0,0,0.08)`
              : '0 10px 30px rgba(0,0,0,0.05)'
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<AllCoursesPage />} />
            <Route path="/course/:id" element={<CoursePage />} />
            <Route path="/selection" element={<CourseSelectionPage />} />
            <Route path="/grade" element={<GradePage />} />
            <Route path="/tiers" element={<CourseTierListPage />} />
            <Route path="/debug" element={<DebugPage />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;