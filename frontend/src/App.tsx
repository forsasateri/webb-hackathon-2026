import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<AllCoursesPage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/selection" element={<CourseSelectionPage />} />
          <Route path="/grade" element={<GradePage />} />
          <Route path="/tiers" element={<CourseTierListPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
