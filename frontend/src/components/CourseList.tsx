import { Layout, Typography, Row, Col } from 'antd';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';

const { Content } = Layout;
const { Title } = Typography;

interface CourseListProps {
  courses: Course[];
  title?: string;
  onDrop?: (id: number) => void;
}

export const CourseList = ({ courses, title = 'All Available Courses', onDrop }: CourseListProps) => {
  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2} style={{ marginBottom: '30px' }}>
          {title}
        </Title>
        <Row gutter={[16, 16]}>
          {courses.map((course) => (
            <Col xs={24} sm={24} md={12} lg={8} key={course.id}>
              <CourseCard 
              course={course} 
              onDrop={onDrop}
              />
            </Col>
          ))}
        </Row>
      </div>
    </Content>
  );
};
