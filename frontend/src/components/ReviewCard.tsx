import { Card, Button, Rate, Typography, Space } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ReviewResponse } from '../api/reviews';

const { Text, Paragraph } = Typography;

interface ReviewCardProps {
  review: ReviewResponse;
  currentUserId: number | null;
  onDelete?: (reviewId: number) => void;
}

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
        <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
        {review.comment && (
          <Paragraph style={{ margin: 0, marginTop: 4 }}>{review.comment}</Paragraph>
        )}
      </Space>
    </Card>
  );
};
