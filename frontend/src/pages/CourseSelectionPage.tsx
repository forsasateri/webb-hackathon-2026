import { useEffect, useState } from 'react';
import { Layout, Typography } from 'antd';
import { getAllCourses } from '../api';
import type { Course } from '../types';
import { LoadingSpinner, CourseRoulette } from '../components';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export const CourseSelectionPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
      setLoading(false);
    };

    fetchCourses();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center' }}>Course Selection Wheel</Title>
        <Paragraph style={{ textAlign: 'center', fontSize: '16px', marginBottom: '40px' }}>
          Feeling adventurous? Let fate decide your next course! Spin the wheel and see which course you get.
        </Paragraph>
        <CourseRoulette courses={courses} />
      </div>
    </Content>
  );
};
