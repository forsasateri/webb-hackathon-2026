import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Typography, Empty } from 'antd';
import { RATING_DIMENSIONS } from '../types/course';

const { Text } = Typography;

interface RadarDataItem {
  dimension: string;
  value: number;
  fullMark: 5;
}

interface CourseRadarChartProps {
  /** The 6-dimension average ratings keyed by dimension name */
  data: {
    avg_workload: number | null;
    avg_difficulty: number | null;
    avg_practicality: number | null;
    avg_grading: number | null;
    avg_teaching_quality: number | null;
    avg_interest: number | null;
  };
  /** Chart width/height (defaults to 300) */
  size?: number;
  /** Whether to show title above the chart */
  showTitle?: boolean;
}

const DIMENSION_TO_AVG_KEY: Record<string, string> = {
  workload: 'avg_workload',
  difficulty: 'avg_difficulty',
  practicality: 'avg_practicality',
  grading: 'avg_grading',
  teaching_quality: 'avg_teaching_quality',
  interest: 'avg_interest',
};

export const CourseRadarChart = ({ data, size = 300, showTitle = true }: CourseRadarChartProps) => {
  // Check if any dimension has data
  const hasData = RATING_DIMENSIONS.some(
    (d) => data[DIMENSION_TO_AVG_KEY[d.key] as keyof typeof data] !== null
  );

  if (!hasData) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Empty description="No ratings yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  const radarData: RadarDataItem[] = RATING_DIMENSIONS.map((d) => ({
    dimension: d.label,
    value: (data[DIMENSION_TO_AVG_KEY[d.key] as keyof typeof data] as number) ?? 0,
    fullMark: 5,
  }));

  return (
    <div style={{ textAlign: 'center' }}>
      {showTitle && (
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
          Course Rating Overview
        </Text>
      )}
      <ResponsiveContainer width="100%" height={size}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="rgba(0, 240, 255, 0.15)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? value.toFixed(2) : '–', 'Avg']}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgba(0, 240, 255, 0.2)',
              background: 'rgba(17, 24, 39, 0.95)',
              color: '#e2e8f0',
              fontSize: 12,
            }}
          />
          <Radar
            name="Rating"
            dataKey="value"
            stroke="#00f0ff"
            fill="#00f0ff"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
