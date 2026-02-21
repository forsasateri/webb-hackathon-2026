import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components';
import { AuthProvider } from './context/AuthContext';

import {
  HomePage,
  AllCoursesPage,
  CoursePage,
  CourseSelectionPage,
  GradePage,
  CourseTierListPage,
  DebugPage,
  LoginPage,
  SchedulePage,
  CourseBattlePage,
} from './pages';

/** Framer Motion page transition variants */
const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -15, filter: 'blur(4px)' },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.35,
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<AllCoursesPage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/selection" element={<CourseSelectionPage />} />
          <Route path="/grade" element={<GradePage />} />
          <Route path="/tiers" element={<CourseTierListPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/battle" element={<CourseBattlePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

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
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Animated cyber grid background */}
      <div className="cyber-grid-bg" />

      <Navbar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '40px',
          position: 'relative',
          zIndex: 1,
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
            maxWidth: '1100px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 240, 255, 0.08)',
            borderRadius: 16,
            padding: '60px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            transform: enableTilt
              ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`
              : 'none',
            boxShadow: enableTilt
              ? `${-rotate.y * 2}px ${rotate.x * 2}px 40px rgba(0, 240, 255, 0.06), 0 0 80px rgba(0, 0, 0, 0.5)`
              : '0 10px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0, 240, 255, 0.04)',
          }}
        >
          <AnimatedRoutes />
        </div>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;