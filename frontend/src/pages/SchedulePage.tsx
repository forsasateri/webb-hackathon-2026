import { useEffect, useState } from 'react';
import { Layout, Typography, Button, Card, Empty, Tag, Space, Row, Col, message } from 'antd';
import { Link } from 'react-router-dom';
import {
  DeleteOutlined,
  CalendarOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getSchedule, dropCourse } from '../api/enrollment';
import type { ScheduleEntry } from '../types/course';
import { LoadingSpinner } from '../components';
import { useAuth } from '../context/AuthContext';
import { timeSlotsToString } from '../shared';

const { Content } = Layout;
const { Title, Text } = Typography;

export const SchedulePage = () => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const data = await getSchedule();
      setSchedule(data.schedule);
      setTotalCredits(data.total_credits);
    } catch (err: any) {
      message.error('Failed to load schedule');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSchedule();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleDrop = async (courseId: number) => {
    try {
      await dropCourse(courseId);
      message.success('Course dropped');
      // Refresh schedule
      await fetchSchedule();
    } catch (err: any) {
      message.error(err.message || 'Failed to drop course');
    }
  };

  if (!isAuthenticated) {
    return (
      <Content style={{ padding: '50px', textAlign: 'center' }}>
        <Empty
          description="Please login to view your schedule"
        >
          <Link to="/login">
            <Button type="primary">Login</Button>
          </Link>
        </Empty>
      </Content>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <Content style={{ padding: '50px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>
            <CalendarOutlined /> My Schedule
          </Title>
          <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
            Total Credits: {totalCredits}
          </Tag>
        </div>

        {schedule.length === 0 ? (
          <Empty description="No courses enrolled yet">
            <Link to="/courses">
              <Button type="primary" icon={<BookOutlined />}>
                Browse Courses
              </Button>
            </Link>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {schedule.map((entry) => (
              <Col xs={24} md={12} key={entry.enrollment_id}>
                <Card
                  hoverable
                  title={
                    <Link to={`/course/${entry.course.id}`}>
                      <strong>{entry.course.code}</strong> - {entry.course.name}
                    </Link>
                  }
                  extra={
                    <Tag color={entry.finished_status ? 'green' : 'processing'}>
                      {entry.finished_status ? 'Completed' : 'In Progress'}
                    </Tag>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                      <ClockCircleOutlined /> Time: {timeSlotsToString(entry.course)}
                    </Text>
                    <Text>Credits: {entry.course.credits}</Text>
                    <Text type="secondary">
                      Enrolled: {new Date(entry.enrolled_at).toLocaleDateString()}
                    </Text>
                    {entry.score !== null && (
                      <Text strong>Score: {entry.score}</Text>
                    )}
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDrop(entry.course.id)}
                      style={{ marginTop: 8 }}
                    >
                      Drop Course
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </Content>
  );
};
