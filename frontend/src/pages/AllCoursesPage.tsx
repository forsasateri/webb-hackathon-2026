import { useEffect, useState } from 'react';
import { getAllCourses } from '../api';
import { getSchedule, enrollInCourse, dropCourse } from '../api/enrollment';
import confetti from 'canvas-confetti';
import type { Course } from '../types';
import { LoadingSpinner, CourseList } from '../components';
import { useAuth } from '../context/AuthContext';
import { message } from 'antd';

export const AllCoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAllCourses();
        setCourses(data);

        if (isAuthenticated) {
          try {
            const scheduleData = await getSchedule();
            const ids = new Set(scheduleData.schedule.map(e => e.course.id));
            setEnrolledIds(ids);
          } catch {
            // Schedule fetch may fail if not authenticated
          }
        }
      } catch (err: any) {
        message.error('Failed to load courses');
      }
      setLoading(false);
    };

    fetchData();
  }, [isAuthenticated]);

  // Merge enrolled status into courses
  const coursesWithEnrolled = courses.map(c => ({
    ...c,
    enrolled: enrolledIds.has(c.id),
  }));

  const handleEnroll = async (id: number) => {
    if (!isAuthenticated) {
      message.warning('Please login to enroll in courses');
      return;
    }
    try {
      await enrollInCourse(id);
      message.success('Successfully enrolled!');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#00f0ff', '#b026ff', '#ffd700'] });
      setEnrolledIds(prev => new Set(prev).add(id));
    } catch (err: any) {
      if (err.status === 409) {
        const conflicts = err.data?.conflicts || [];
        const conflictMsg = conflicts
          .map((c: any) => `Period ${c.period}, Slot ${c.slot} conflicts with ${c.conflicting_course_name}`)
          .join('; ');
        message.error(`Time conflict: ${conflictMsg || err.message}`);
      } else {
        message.error(err.message || 'Failed to enroll');
      }
    }
  };

  const handleDrop = async (id: number) => {
    try {
      await dropCourse(id);
      message.success('Course dropped');
      setEnrolledIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      message.error(err.message || 'Failed to drop course');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <CourseList
      courses={coursesWithEnrolled}
      onEnroll={handleEnroll}
      onDrop={handleDrop}
    />
  );
};