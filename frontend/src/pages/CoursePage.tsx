import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCourseById } from '../api';
import type { Course } from '../types';
import { LoadingSpinner, CourseDetail, NotFound } from '../components';

export const CoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      if (isNaN(Number(id))) return; // Invalid ID format
      setLoading(true);
      const data = await getCourseById(Number(id));
      setCourse(data || null);
      setLoading(false);
    };

    fetchCourse();
  }, [id]);

  const handleToggleEnroll = () => {
    setCourse(prev =>
      prev
        ? {
            ...prev,
            enrolled: !prev.enrolled,
            score: prev.enrolled ? undefined : prev.score
          }
        : prev
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <NotFound />;

  return (
    <CourseDetail
      course={course}
      onToggleEnroll={handleToggleEnroll}
    />
  );
};