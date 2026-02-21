import { useState, useEffect, useCallback } from 'react';
import { Typography, Rate, Input, Button, Space, Divider, Empty, Spin, message } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { getCourseReviews, addCourseReview, deleteCourseReview } from '../api/reviews';
import type { ReviewResponse } from '../api/reviews';
import { ReviewCard } from './ReviewCard';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ReviewSectionProps {
  courseId: number;
}

export const ReviewSection = ({ courseId }: ReviewSectionProps) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCourseReviews(courseId);
      setReviews(data.reviews);
      setAvgRating(data.avg_rating);
      setTotal(data.total);
    } catch {
      message.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async () => {
    if (rating === 0) {
      message.warning('Please select a rating');
      return;
    }
    try {
      setSubmitting(true);
      await addCourseReview(courseId, rating, comment);
      message.success('Review submitted!');
      setRating(0);
      setComment('');
      await fetchReviews();
    } catch (err: any) {
      if (err.status === 409) {
        message.warning('You have already reviewed this course');
      } else {
        message.error(err.message || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    try {
      await deleteCourseReview(reviewId);
      message.success('Review deleted');
      await fetchReviews();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete review');
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <Divider />
      <Title level={4}>
        <StarOutlined style={{ marginRight: 8 }} />
        Reviews
        {avgRating !== null && (
          <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
            Average: {avgRating.toFixed(1)} / 5 ({total} review{total !== 1 ? 's' : ''})
          </Text>
        )}
      </Title>

      {/* Submit review form */}
      {isAuthenticated ? (
        <div style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
          <Text strong>Write a Review</Text>
          <div style={{ marginTop: 8 }}>
            <Rate value={rating} onChange={setRating} />
          </div>
          <TextArea
            rows={3}
            placeholder="Share your thoughts about this course... (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            style={{ marginTop: 8 }}
            disabled={rating === 0}
          >
            Submit Review
          </Button>
        </div>
      ) : (
        <div style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
          <Text type="secondary">Login to write a review</Text>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <Spin style={{ display: 'block', textAlign: 'center', marginTop: 20 }} />
      ) : reviews.length === 0 ? (
        <Empty description="Be the first to review!" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id ?? null}
              onDelete={handleDelete}
            />
          ))}
        </Space>
      )}
    </div>
  );
};
