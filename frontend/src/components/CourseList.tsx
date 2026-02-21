import { useState } from 'react';
import { Layout, Typography, Row, Col, Pagination } from 'antd';
import type { Course } from '../types';
import { CourseCard } from './CourseCard';

const { Content } = Layout;
const { Title } = Typography;

const PAGE_SIZE = 12;

interface CourseListProps {
  courses: Course[];
  title?: string;
  onEnroll?: (id: number) => void;
  onDrop?: (id: number) => void;
}

export const CourseList = ({ courses, title = 'All Available Courses', onEnroll, onDrop }: CourseListProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedCourses = courses.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2} style={{ marginBottom: '30px' }}>
          {title}
        </Title>
        <Row gutter={[16, 16]}>
          {paginatedCourses.map((course) => (
            <Col xs={24} sm={24} md={12} lg={8} key={course.id}>
              <CourseCard 
              course={course} 
              onEnroll={onEnroll}
              onDrop={onDrop}
              />
            </Col>
          ))}
        </Row>
        {courses.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <Pagination
              current={currentPage}
              total={courses.length}
              pageSize={PAGE_SIZE}
              onChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              showSizeChanger={false}
              showTotal={(total) => `Total ${total} courses`}
            />
          </div>
        )}
      </div>
    </Content>
  );
};
