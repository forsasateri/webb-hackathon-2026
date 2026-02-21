import { useEffect, useState } from 'react';
import { getAllCourses } from '../api';
import type { Course } from '../types';
import { LoadingSpinner } from '../components';
import { Tierlist } from '../components/tierlist/Tierlist';

export const CourseTierListPage = () => {
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

  return <Tierlist courses={courses} />;
};
