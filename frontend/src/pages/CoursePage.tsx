import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCourseById } from '../api';
import { getSchedule, enrollInCourse, dropCourse } from '../api/enrollment';
import type { Course } from '../types';
import { LoadingSpinner, CourseDetail, NotFound } from '../components';
import { ReviewSection } from '../components/ReviewSection';
import { RecommendationSection } from '../components/RecommendationSection';
import { useAuth } from '../context/AuthContext';
import { message, Layout } from 'antd';

const { Content } = Layout;

export const CoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      if (isNaN(Number(id))) return;
      setLoading(true);
      const data = await getCourseById(Number(id));
      setCourse(data || null);

      // Check if this course is in the user's schedule
      if (isAuthenticated) {
        try {
          const scheduleData = await getSchedule();
          const isEnrolled = scheduleData.schedule.some(e => e.course.id === Number(id));
          setEnrolled(isEnrolled);
        } catch {
          // Ignore schedule errors
        }
      }

      setLoading(false);
    };

    fetchCourse();
  }, [id, isAuthenticated]);

  const handleToggleEnroll = async () => {
    if (!course) return;
    if (!isAuthenticated) {
      message.warning('Please login to enroll in courses');
      return;
    }

    if (enrolled) {
      // Drop course
      try {
        await dropCourse(course.id);
        message.success('Course dropped');
        setEnrolled(false);
      } catch (err: any) {
        message.error(err.message || 'Failed to drop course');
      }
    } else {
      // Enroll
      try {
        await enrollInCourse(course.id);
        message.success('Successfully enrolled!');
        setEnrolled(true);
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
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!course) return <NotFound />;

  const courseWithEnrolled = { ...course, enrolled };
  const courseId = Number(id);

  return (
    <div>
      <CourseDetail
        course={courseWithEnrolled}
        onToggleEnroll={handleToggleEnroll}
      />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 50px' }}>
        <RecommendationSection courseId={courseId} />
        <ReviewSection courseId={courseId} />
      </div>
    </div>
  );
};