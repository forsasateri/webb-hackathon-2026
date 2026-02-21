import { useState } from 'react';
import { Card, Typography, Tag, Space, Button } from 'antd';
import { ClockCircleOutlined, TrophyOutlined, DownOutlined, UpOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { Course } from '../../types';
import { computeOverallAvg, RATING_DIMENSIONS } from '../../types/course';
import { timeSlotsToString } from '../../shared';
import { getColorForCourse } from '../../shared/courseColor';
import { CourseRadarChart } from '../CourseRadarChart';

const { Title, Text, Paragraph } = Typography;

interface BattleCardProps {
  course: Course;
  onSelect: (course: Course) => void;
  isWinner?: boolean;
  disabled?: boolean;
}

/** Check whether a course has any rating data */
const hasRatingData = (course: Course): boolean => {
  return RATING_DIMENSIONS.some(
    (d) => course[`avg_${d.key}` as keyof Course] !== null
  );
};

export const BattleCard = ({ course, onSelect, isWinner, disabled }: BattleCardProps) => {
  const accentColor = getColorForCourse(course);
  const overallAvg = computeOverallAvg(course);
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
      hoverable={!disabled}
      onClick={() => !disabled && onSelect(course)}
      className="card-hover-lift"
      style={{
        width: 340,
        cursor: disabled ? 'default' : 'pointer',
        border: isWinner
          ? '2px solid #39ff14'
          : `2px solid ${accentColor}`,
        borderRadius: 12,
        transition: 'all 0.3s ease',
        transform: disabled ? 'none' : undefined,
        boxShadow: isWinner
          ? `0 0 20px rgba(57, 255, 20, 0.3), 0 4px 20px rgba(0,0,0,0.4)`
          : `0 0 12px ${accentColor}33, 0 4px 20px rgba(0,0,0,0.3)`,
        background: 'var(--bg-card)',
      }}
      styles={{
        header: {
          background: accentColor,
          borderRadius: '10px 10px 0 0',
          padding: '8px 16px',
          minHeight: 0,
        },
        body: {
          padding: '12px 16px',
        },
      }}
      title={
        <Space>
          {isWinner && <TrophyOutlined style={{ color: '#fff', fontSize: 18 }} />}
          <Text strong style={{ color: '#fff', fontSize: 16 }}>{course.code}</Text>
        </Space>
      }
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0, fontSize: 15 }}>{course.name}</Title>

        <Space size={4} wrap>
          <Tag color="blue">{course.credits} credits</Tag>
          {overallAvg !== null && (
            <Tag color="gold">★ {overallAvg.toFixed(1)}</Tag>
          )}
          {!hasRatings && (
            <Tag icon={<QuestionCircleOutlined />} color="default">No ratings</Tag>
          )}
        </Space>

        {/* Radar Chart — only render when ratings exist */}
        {hasRatings ? (
          <div style={{ margin: '2px 0 0' }}>
            <CourseRadarChart data={radarData} size={190} showTitle={false} />
          </div>
        ) : (
          /* No-rating placeholder: show 2-line description instead */
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}
          >
            {course.description}
          </Paragraph>
        )}

        {/* Collapsible description — only show toggle when radar is displayed */}
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

        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          <div><ClockCircleOutlined /> {timeSlotsToString(course)}</div>
          <div>{course.instructor} · {course.department}</div>
        </div>

        {!isWinner && !disabled && (
          <Button
            type="primary"
            block
            size="middle"
            style={{
              marginTop: 4,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              borderColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}44`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(course);
            }}
          >
            ⚡ I pick this one!
          </Button>
        )}
      </Space>
    </Card>
  );
};
