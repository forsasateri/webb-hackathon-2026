import { useState, useEffect, useCallback } from 'react';
import { Typography, Rate, Input, Button, Space, Divider, Empty, Spin, message, Row, Col } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { getCourseReviews, addCourseReview, deleteCourseReview } from '../api/reviews';
import type { ReviewResponse, ReviewCreatePayload } from '../api/reviews';
import { ReviewCard } from './ReviewCard';
import { CourseRadarChart } from './CourseRadarChart';
import { useAuth } from '../context/AuthContext';
import { RATING_DIMENSIONS } from '../types/course';
import type { RatingDimensionKey } from '../types/course';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ReviewSectionProps {
  courseId: number;
}

const INITIAL_RATINGS: Record<RatingDimensionKey, number> = {
  workload: 0,
  difficulty: 0,
  practicality: 0,
  grading: 0,
  teaching_quality: 0,
  interest: 0,
};

export const ReviewSection = ({ courseId }: ReviewSectionProps) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [avgData, setAvgData] = useState<{
    avg_workload: number | null;
    avg_difficulty: number | null;
    avg_practicality: number | null;
    avg_grading: number | null;
    avg_teaching_quality: number | null;
    avg_interest: number | null;
  }>({
    avg_workload: null,
    avg_difficulty: null,
    avg_practicality: null,
    avg_grading: null,
    avg_teaching_quality: null,
    avg_interest: null,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state — 6 dimensions
  const [ratings, setRatings] = useState<Record<RatingDimensionKey, number>>({ ...INITIAL_RATINGS });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCourseReviews(courseId);
      setReviews(data.reviews);
      setAvgData({
        avg_workload: data.avg_workload,
        avg_difficulty: data.avg_difficulty,
        avg_practicality: data.avg_practicality,
        avg_grading: data.avg_grading,
        avg_teaching_quality: data.avg_teaching_quality,
        avg_interest: data.avg_interest,
      });
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

  const allRated = RATING_DIMENSIONS.every((d) => ratings[d.key] > 0);

  const handleSubmit = async () => {
    if (!allRated) {
      message.warning('Please rate all 6 dimensions');
      return;
    }
    try {
      setSubmitting(true);
      const payload: ReviewCreatePayload = {
        workload: ratings.workload,
        difficulty: ratings.difficulty,
        practicality: ratings.practicality,
        grading: ratings.grading,
        teaching_quality: ratings.teaching_quality,
        interest: ratings.interest,
        comment: comment || undefined,
      };
      await addCourseReview(courseId, payload);
      message.success('Review submitted!');
      setRatings({ ...INITIAL_RATINGS });
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

  const handleRatingChange = (key: RatingDimensionKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ marginTop: 32 }}>
      <Divider />
      <Title level={4}>
        <StarOutlined style={{ marginRight: 8 }} />
        Reviews
        {total > 0 && (
          <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
            ({total} review{total !== 1 ? 's' : ''})
          </Text>
        )}
      </Title>

      {/* Average ratings radar chart */}
      {total > 0 && (
        <div style={{ marginBottom: 24 }}>
          <CourseRadarChart data={avgData} size={260} showTitle={false} />
        </div>
      )}

      {/* Submit review form — 6 dimensions */}
      {isAuthenticated ? (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12, color: 'var(--text-primary)' }}>Write a Review</Text>
          <Row gutter={[16, 8]}>
            {RATING_DIMENSIONS.map((d) => (
              <Col xs={24} sm={12} key={d.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: d.color,
                    }}
                  />
                  <Text style={{ minWidth: 110 }}>{d.label}</Text>
                  <Rate
                    value={ratings[d.key]}
                    onChange={(v) => handleRatingChange(d.key, v)}
                    style={{ fontSize: 16 }}
                  />
                </div>
              </Col>
            ))}
          </Row>
          <TextArea
            rows={3}
            placeholder="Share your thoughts about this course... (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginTop: 12 }}
          />
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            style={{ marginTop: 8 }}
            disabled={!allRated}
          >
            Submit Review
          </Button>
        </div>
      ) : (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-card)', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
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
