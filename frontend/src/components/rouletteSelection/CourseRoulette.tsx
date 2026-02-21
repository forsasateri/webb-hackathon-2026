import { useState, useEffect } from 'react';
import { Button, Typography, Modal, message } from 'antd';
import type { Course } from '../../types';
import { enrollInCourse, getSchedule } from '../../api/enrollment';
import { useAuth } from '../../context/AuthContext';

import { SelectedCourse } from './selectedCourse';
import { CourseWheel } from './CourseWheel';

// Filter out all courses with same time slot as the currently selected courses to prevent time conflicts. If no courses are selected, return all courses.
const filterValidCourses = (courses: Course[], selectedCourses: Course[]) => {
  if (selectedCourses.length === 0) return courses;

  // We identify every unique time slot by period and slot

  const selectedTimeSlots = new Set<string>();
  selectedCourses.forEach(course => {
    course.time_slots.forEach(ts => {
      selectedTimeSlots.add(`${ts.period}-${ts.slot}`);
    });
  });

  return courses.filter(course => {
    return !course.time_slots.some(ts => selectedTimeSlots.has(`${ts.period}-${ts.slot}`));
  });

};

// Randomly select a subset of courses for the wheel (to avoid overcrowding)
const generateRandomSubset = (courses: Course[], min: number = 12, max: number = 15): Course[] => {
  if (courses.length === 0) return [];
  
  // If there are fewer courses than min, return all
  if (courses.length <= min) return [...courses];
  
  // Random count between min and max
  const count = Math.min(
    courses.length,
    Math.floor(Math.random() * (max - min + 1)) + min
  );
  
  // Shuffle and take first 'count' courses
  const shuffled = [...courses].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

interface CourseRouletteProps {
  courses: Course[];
}

export const CourseRoulette = ({ courses }: CourseRouletteProps) => {
  const { isAuthenticated } = useAuth();
  
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [wheelCourses, setWheelCourses] = useState<Course[]>([]);
  const [pendingCourse, setPendingCourse] = useState<Course | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Load already enrolled courses from backend on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadSchedule = async () => {
      try {
        const data = await getSchedule();
        const enrolledCourses = data.schedule.map(e => e.course);
        setSelectedCourses(enrolledCourses);
      } catch {
        // Ignore - user may not have courses
      }
    };
    loadSchedule();
  }, [isAuthenticated]);
  
  const validCourses = filterValidCourses(courses, selectedCourses);

  const handleGenerateRandomCourses = () => {
    const randomSubset = generateRandomSubset(validCourses);
    setWheelCourses(randomSubset);
  };

  // Override setSelectedCourses to intercept and show confirmation
  const handleWheelStop = (newCourses: Course[]) => {
    // Find the newly added course (last one)
    const newCourse = newCourses[newCourses.length - 1];
    if (newCourse) {
      setPendingCourse(newCourse);
    }
  };

  const handleConfirmEnroll = async () => {
    if (!pendingCourse) return;
    
    if (!isAuthenticated) {
      message.warning('Please login first to enroll in courses');
      setPendingCourse(null);
      return;
    }

    setEnrolling(true);
    try {
      await enrollInCourse(pendingCourse.id);
      message.success(`Successfully enrolled in ${pendingCourse.code}!`);
      setSelectedCourses(prev => [...prev, pendingCourse]);
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
    } finally {
      setEnrolling(false);
      setPendingCourse(null);
    }
  };

  const handleCancelEnroll = () => {
    setPendingCourse(null);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <Typography.Title level={2} style={{ marginTop: '20px', marginBottom: '30px' }}>
        Course Selection Wheel
      </Typography.Title>
      
      {wheelCourses.length === 0 ? (
        <div style={{ marginTop: '50px' }}>
          <Typography.Paragraph style={{ fontSize: '16px', marginBottom: '20px' }}>
            Click the button below to generate a random selection of courses for the wheel.
          </Typography.Paragraph>
          <Button 
            type="primary" 
            size="large" 
            onClick={handleGenerateRandomCourses}
            disabled={validCourses.length === 0}
          >
            🎲 Generate Random Courses
          </Button>
          {validCourses.length === 0 && (
            <Typography.Paragraph style={{ marginTop: '20px', color: '#999' }}>
              All courses have been selected or have time conflicts!
            </Typography.Paragraph>
          )}
        </div>
      ) : (
        <>
          <Button 
            type="default" 
            size="small" 
            onClick={handleGenerateRandomCourses}
            style={{ marginBottom: '20px' }}
            disabled={validCourses.length === 0}
          >
            🔄 Regenerate Courses
          </Button>
          <CourseWheel 
            validCourses={wheelCourses} 
            setSelectedCourses={handleWheelStop} 
          />
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Enrollment"
        open={!!pendingCourse}
        onOk={handleConfirmEnroll}
        onCancel={handleCancelEnroll}
        confirmLoading={enrolling}
        okText="Enroll Now"
        cancelText="Cancel"
      >
        {pendingCourse && (
          <div>
            <p>You landed on:</p>
            <p><strong>{pendingCourse.code} - {pendingCourse.name}</strong></p>
            <p>Credits: {pendingCourse.credits}</p>
            <p>Would you like to enroll in this course?</p>
          </div>
        )}
      </Modal>

      {selectedCourses.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <Typography.Title level={3}>Selected Courses</Typography.Title>
          {selectedCourses.map(course => <SelectedCourse key={course.id} course={course} />)}
        </div>
      )}
    </div>
  );
};
