import { useState, useMemo } from 'react';
import { Card, Button, Space, Tag, Typography } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, BookOutlined, DownOutlined, UpOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { Course } from '../types';
import { computeOverallAvg, RATING_DIMENSIONS } from '../types/course';
import { Link } from 'react-router-dom';
import { timeSlotsToString } from '../shared';
import { CourseRadarChart } from './CourseRadarChart';

const { Paragraph, Text } = Typography;

interface CourseCardProps {
  course: Course;
  onEnroll?: (id: number) => void;
  onDrop?: (id: number) => void;
}

/** Check whether a course has any rating data */
const hasRatingData = (course: Course): boolean => {
  return RATING_DIMENSIONS.some(
    (d) => course[`avg_${d.key}` as keyof Course] !== null
  );
};

export const CourseCard = ({ course, onEnroll, onDrop }: CourseCardProps) => {
  const overallRating = useMemo(() => computeOverallAvg(course), [course]);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasRatings = hasRatingData(course);

  const radarData = {
    avg_workload: course.avg_workload,
    avg_difficulty: course.avg_difficulty,
    avg_practicality: course.avg_practicality,
    avg_grading: course.avg_grading,
    avg_teaching_quality: course.avg_teaching_quality,
    avg_interest: course.avg_interest,
  };

  return (
    <Card
      hoverable
      title={
        <Link to={`/course/${course.id}`}>
          <strong>{course.code}</strong> - {course.name}
        </Link>
      }
      extra={
        <span>
          <ClockCircleOutlined /> {timeSlotsToString(course)}
        </span>
      }
      style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%', flex: 1 }}>
        {/* Tags row */}
        <Space size={4} wrap>
          <Tag color="blue"><BookOutlined /> {course.credits} credits</Tag>
          {overallRating !== null && (
            <Tag color="gold">★ {overallRating.toFixed(1)}</Tag>
          )}
          {!hasRatings && (
            <Tag icon={<QuestionCircleOutlined />} color="default">No ratings</Tag>
          )}
        </Space>

        {/* Radar Chart or fallback description */}
        {hasRatings ? (
          <div style={{ margin: '2px 0 0' }}>
            <CourseRadarChart data={radarData} size={190} showTitle={false} />
          </div>
        ) : (
          <Paragraph
            ellipsis={{ rows: 3 }}
            style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}
          >
            {course.description}
          </Paragraph>
        )}

        {/* Collapsible description toggle */}
        {hasRatings && (
          <div
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setDescExpanded((v) => !v);
            }}
          >
            {descExpanded ? (
              <Paragraph style={{ margin: 0, color: '#666', fontSize: 12 }}>
                {course.description}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  <UpOutlined /> less
                </Text>
              </Paragraph>
            ) : (
              <Text type="secondary" style={{ fontSize: 12, cursor: 'pointer' }}>
                <DownOutlined /> Show description
              </Text>
            )}
          </div>
        )}

        {/* Meta info */}
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          <div>{course.instructor} · {course.department}</div>
        </div>
      </Space>

      {/* Enroll / Drop actions */}
      <Space style={{ marginTop: 8 }}>
        {course.enrolled ? (
          <>
            <span style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> Enrolled
            </span>
            {onDrop && (
              <Button
                danger
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDrop(course.id);
                }}
              >
                Drop Course
              </Button>
            )}
          </>
        ) : (
          onEnroll && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEnroll(course.id);
              }}
            >
              Take Course
            </Button>
          )
        )}
      </Space>
    </Card>
  );
};
