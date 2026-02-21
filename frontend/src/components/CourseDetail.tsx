import { Layout, Typography, Card, Button, Descriptions } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { getTimeSlotLabel } from '../shared';

const { Content } = Layout;
const { Title } = Typography;

interface CourseDetailProps {
  course: Course;
  onToggleEnroll?: (id: string) => void;
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
            {course.courseCode} - {course.name}
          </Title>

          <Descriptions column={1} style={{ marginTop: '20px' }}>
            <Descriptions.Item label="Course Code">
              {course.courseCode}
            </Descriptions.Item>

            <Descriptions.Item label="Course ID">
              {course.id}
            </Descriptions.Item>

            <Descriptions.Item label="Time Slot">
              <ClockCircleOutlined /> Slot {course.time_slot} (
              {getTimeSlotLabel(course.time_slot)})
            </Descriptions.Item>

            <Descriptions.Item label="Description">
              {course.description}
            </Descriptions.Item>

            <Descriptions.Item label="Status">
              {course.enrolled ? 'Enrolled' : 'Not Enrolled'}
            </Descriptions.Item>

            <Descriptions.Item label="Grade">
              {course.score ?? 'Not scored yet'}
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