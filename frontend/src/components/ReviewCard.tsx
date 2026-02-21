import { Card, Button, Typography, Space, Progress } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ReviewResponse } from '../api/reviews';
import { RATING_DIMENSIONS } from '../types/course';

const { Text, Paragraph } = Typography;

interface ReviewCardProps {
  review: ReviewResponse;
  currentUserId: number | null;
  onDelete?: (reviewId: number) => void;
}

const DIMENSION_KEY_MAP: Record<string, keyof ReviewResponse> = {
  workload: 'workload',
  difficulty: 'difficulty',
  practicality: 'practicality',
  grading: 'grading',
  teaching_quality: 'teaching_quality',
  interest: 'interest',
};

export const ReviewCard = ({ review, currentUserId, onDelete }: ReviewCardProps) => {
  const isOwner = currentUserId !== null && review.user_id === currentUserId;
  const createdDate = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      extra={
        isOwner && onDelete ? (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(review.id)}
          >
            Delete
          </Button>
        ) : null
      }
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          <UserOutlined />
          <Text strong>{review.username}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{createdDate}</Text>
        </Space>

        {/* 6-dimension compact scores */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4 }}>
          {RATING_DIMENSIONS.map((d) => {
            const val = review[DIMENSION_KEY_MAP[d.key]] as number;
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 160 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: d.color,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 12, minWidth: 90, color: 'var(--text-secondary)' }}>{d.label}</Text>
                <Progress
                  percent={(val / 5) * 100}
                  steps={5}
                  size="small"
                  strokeColor={d.color}
                  showInfo={false}
                  style={{ margin: 0 }}
                />
                <Text style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 12 }}>{val}</Text>
              </div>
            );
          })}
        </div>

        {review.comment && (
          <Paragraph style={{ margin: 0, marginTop: 4 }}>{review.comment}</Paragraph>
        )}
      </Space>
    </Card>
  );
};
