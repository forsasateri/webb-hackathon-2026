import { Card, Button, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { Link } from 'react-router-dom';
import { timeSlotsToString } from '../shared';

interface CourseCardProps {
  course: Course;
  onEnroll?: (id: number) => void;
  onDrop?: (id: number) => void;
}

export const CourseCard = ({ course, onEnroll, onDrop }: CourseCardProps) => {
  return (
    <Card
      hoverable
      title={
        <Link to={`/course/${course.id}`}>
          <strong>{course.code}</strong> - {course.name}
        </Link>
      }
      extra={
        <span>
          <ClockCircleOutlined /> Slot {timeSlotsToString(course)}
        </span>
      }
      style={{ marginBottom: '16px' }}
    >
      <p>{course.description}</p>

      <Space style={{ marginTop: 12 }}>
        {course.enrolled ? (
          <>
            <span style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> Enrolled
            </span>
            {onDrop && (
              <Button
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDrop(course.id);
                }}
              >
                Drop Course
              </Button>
            )}
          </>
        ) : (
          onEnroll && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEnroll(course.id);
              }}
            >
              Take Course
            </Button>
          )
        )}
      </Space>
    </Card>
  );
};
