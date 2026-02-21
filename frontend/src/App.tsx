import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import { Navbar } from './components';
import { HomePage, AllCoursesPage, CoursePage, CourseSelectionPage, GradePage, CourseEvaluationFormPage, CourseEvaluationResultsPage } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<AllCoursesPage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/courses/:courseId/evaluate" element={<CourseEvaluationFormPage />} />
          <Route path="/courses/:courseId/evaluation" element={<CourseEvaluationResultsPage />} />
          <Route path="/selection" element={<CourseSelectionPage />} />
          <Route path="/grade" element={<GradePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
