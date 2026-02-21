import { Layout, Typography, Card, Button, Descriptions } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { timeSlotsToString } from '../shared';

const { Content } = Layout;
const { Title } = Typography;

interface CourseDetailProps {
  course: Course;
  onToggleEnroll?: (id: number) => void;
}

export const CourseDetail = ({ course, onToggleEnroll }: CourseDetailProps) => {
  const navigate = useNavigate();

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/courses')}
          style={{ marginBottom: '20px' }}
        >
          Back to Courses
        </Button>

        <Card>
          <Title level={2}>
            {course.code} - {course.name}
          </Title>

          <Descriptions column={1} style={{ marginTop: '20px' }}>
            <Descriptions.Item label="Course Code">
              {course.code}
            </Descriptions.Item>

            <Descriptions.Item label="Credits">
              {course.credits}
            </Descriptions.Item>

            <Descriptions.Item label="Instructor">
              {course.instructor}
            </Descriptions.Item>

            <Descriptions.Item label="Department">
              {course.department}
            </Descriptions.Item>

            <Descriptions.Item label="Time Slot">
              <ClockCircleOutlined /> Slot {timeSlotsToString(course)}
            </Descriptions.Item>

            <Descriptions.Item label="Capacity">
              {course.enrolled_count} / {course.capacity}
            </Descriptions.Item>

            <Descriptions.Item label="Average Rating">
              {course.avg_rating !== null ? `${course.avg_rating} / 5` : 'No ratings yet'}
            </Descriptions.Item>

            <Descriptions.Item label="Description">
              {course.description}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              {course.enrolled ? '✅ Enrolled' : 'Not Enrolled'}
            </Descriptions.Item>
          </Descriptions>

          <Button
            type={course.enrolled ? 'default' : 'primary'}
            danger={course.enrolled}
            style={{ marginTop: '24px' }}
            onClick={() => onToggleEnroll?.(course.id)}
          >
            {course.enrolled ? 'Drop Course' : 'Take Course'}
          </Button>
        </Card>
      </div>
    </Content>
  );
};