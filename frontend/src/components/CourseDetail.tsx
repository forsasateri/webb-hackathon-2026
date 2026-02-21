import { Layout, Typography, Card, Button, Descriptions, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { computeOverallAvg } from '../types/course';
import { timeSlotsToString } from '../shared';
import { CourseRadarChart } from './CourseRadarChart';

const { Content } = Layout;
const { Title } = Typography;

interface CourseDetailProps {
  course: Course;
  onToggleEnroll?: (id: number) => void;
}

export const CourseDetail = ({ course, onToggleEnroll }: CourseDetailProps) => {
  const navigate = useNavigate();
  const overallAvg = computeOverallAvg(course);

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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

          <Row gutter={24}>
            <Col xs={24} md={14}>
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

                <Descriptions.Item label="Overall Rating">
                  {overallAvg !== null ? `${overallAvg.toFixed(1)} / 5` : 'No ratings yet'}
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
            </Col>

            <Col xs={24} md={10}>
              <div style={{ marginTop: 20 }}>
                <CourseRadarChart data={course} size={280} />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </Content>
  );
};