import { useState, useEffect } from 'react';
import { Typography, Card, Space, Empty, Spin, Tag } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getCourseRecommendations } from '../api/recommendations';
import type { RecommendedCourse } from '../api/recommendations';

const { Title, Text } = Typography;

interface RecommendationSectionProps {
  courseId: number;
}

export const RecommendationSection = ({ courseId }: RecommendationSectionProps) => {
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const data = await getCourseRecommendations(courseId);
        setRecommendations(data.recommendations || []);
      } catch {
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [courseId]);

  if (loading) {
    return <Spin style={{ display: 'block', textAlign: 'center', marginTop: 20 }} />;
  }

  return (
    <div style={{ marginTop: 24 }}>
      <Title level={4}>
        <BulbOutlined style={{ marginRight: 8 }} />
        Students who took this course also took
      </Title>

      {recommendations.length === 0 ? (
        <Empty description="No recommendations yet" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {recommendations.map((rec) => (
            <Link key={rec.id} to={`/course/${rec.id}`}>
              <Card
                size="small"
                hoverable
                style={{ marginBottom: 4 }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>{rec.code}</Text>
                    <Text>{rec.name}</Text>
                    <Tag color="blue">{rec.credits} credits</Tag>
                  </Space>
                  <Text type="secondary">
                    {rec.co_enroll_count} student{rec.co_enroll_count !== 1 ? 's' : ''} also enrolled
                  </Text>
                </Space>
              </Card>
            </Link>
          ))}
        </Space>
      )}
    </div>
  );
};
