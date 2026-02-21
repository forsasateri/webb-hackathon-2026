import { Card, Typography, Tag, Space, Button } from 'antd';
import { ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import type { Course } from '../../types';
import { timeSlotsToString } from '../../shared';
import { getColorForCourse } from '../../shared/courseColor';

const { Title, Text, Paragraph } = Typography;

interface BattleCardProps {
  course: Course;
  onSelect: (course: Course) => void;
  isWinner?: boolean;
  disabled?: boolean;
}

export const BattleCard = ({ course, onSelect, isWinner, disabled }: BattleCardProps) => {
  const accentColor = getColorForCourse(course);

  return (
    <Card
      hoverable={!disabled}
      onClick={() => !disabled && onSelect(course)}
      style={{
        width: 320,
        minHeight: 300,
        cursor: disabled ? 'default' : 'pointer',
        border: isWinner ? `3px solid #52c41a` : `2px solid ${accentColor}`,
        borderRadius: 12,
        transition: 'all 0.3s ease',
        transform: disabled ? 'none' : undefined,
        boxShadow: isWinner
          ? '0 4px 20px rgba(82, 196, 26, 0.3)'
          : '0 2px 10px rgba(0,0,0,0.08)',
      }}
      styles={{
        header: {
          background: accentColor,
          borderRadius: '10px 10px 0 0',
        },
      }}
      title={
        <Space>
          {isWinner && <TrophyOutlined style={{ color: '#fff', fontSize: 18 }} />}
          <Text strong style={{ color: '#fff', fontSize: 16 }}>{course.code}</Text>
        </Space>
      }
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>{course.name}</Title>

        <Space>
          <Tag color="blue">{course.credits} credits</Tag>
          {course.avg_rating !== null && (
            <Tag color="gold">★ {course.avg_rating.toFixed(1)}</Tag>
          )}
        </Space>

        <Paragraph
          ellipsis={{ rows: 3 }}
          style={{ margin: 0, color: '#666', fontSize: 13 }}
        >
          {course.description}
        </Paragraph>

        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined /> {timeSlotsToString(course)}
        </Text>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {course.instructor} · {course.department}
        </Text>

        {!isWinner && !disabled && (
          <Button
            type="primary"
            block
            style={{ marginTop: 8, background: accentColor, borderColor: accentColor }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(course);
            }}
          >
            I pick this one!
          </Button>
        )}
      </Space>
    </Card>
  );
};
