import { Card } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { Link } from 'react-router-dom';
import { getTimeSlotLabel } from '../shared';

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  return (
    <Link to={`/course/${course.id}`}>
      <Card
        hoverable
        title={
          <span>
            <strong>{course.courseCode}</strong> - {course.name}
          </span>
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
      </Card>
    </Link>
  );
};
