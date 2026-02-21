import { Card, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { Link } from 'react-router-dom';
import { getTimeSlotLabel } from '../shared';

interface CourseCardProps {
  course: Course;
  onDrop?: (id: string) => void;
}

export const CourseCard = ({ course, onDrop }: CourseCardProps) => {
  return (
    <Card
      hoverable
      title={
        <Link to={`/course/${course.id}`}>
          <strong>{course.courseCode}</strong> - {course.name}
        </Link>
      }
      extra={
        <span>
          <ClockCircleOutlined /> Slot {course.time_slot}
        </span>
      }
      style={{ marginBottom: '16px' }}
    >
      <p>{course.description}</p>

      <p style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>
        Time: {getTimeSlotLabel(course.time_slot)}
      </p>

      {course.enrolled && onDrop && (
        <Button
          danger
          style={{ marginTop: '12px' }}
          onClick={(e) => {
            e.stopPropagation(); 
            onDrop(course.id);
          }}
        >
          Drop Course
        </Button>
      )}
    </Card>
  );
};
