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
      setLoading(true);
      const data = await getCourseById(id);
      setCourse(data || null);
      setLoading(false);
    };

    fetchCourse();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!course) return <NotFound />;

  return <CourseDetail course={course} />;
};
