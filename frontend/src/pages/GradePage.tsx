import { useEffect, useState } from 'react';
import { GradesPage as GradesComponent } from '../components/CourseGrade';
import { getAllCourses } from '../api/courses';
import type { Course } from '../types';
import { LoadingSpinner } from '../components';

export const GradePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const data = await getAllCourses();
      setCourses(data);
      setLoading(false);
    };

    fetchCourses();
  }, []);

  if (loading) return <LoadingSpinner />;

  return <GradesComponent courses={courses} />;
};