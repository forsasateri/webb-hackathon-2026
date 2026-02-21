import { Card, Typography, Select } from 'antd';
import { useState } from 'react';
import type { ScheduleEntry } from '../api/enrollment';
import { RollTheDice } from './rollTheDice';

const { Title } = Typography;
const { Option } = Select;

// Convert numeric score (0-100) to Swedish grade (U/3/4/5)
const convertToSwedishGrade = (score: number | null): string => {
  if (score === null) return 'In Progress';
  if (score < 50) return 'U';
  if (score < 70) return '3';
  if (score < 85) return '4';
  return '5';
};

interface GradesPageProps {
  scheduleEntries: ScheduleEntry[];
}

export const GradesPage = ({ scheduleEntries }: GradesPageProps) => {
  // Filter for completed courses (finished_status = true)
  const completedCourses = scheduleEntries.filter(
    (entry) => entry.finished_status
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedEntry = completedCourses.find(
    (entry) => entry.course.id === selectedId
  );

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <Title level={2} style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>My Grades</Title>

      {completedCourses.length === 0 ? (
        <Typography.Paragraph style={{ fontSize: '16px', marginTop: '20px', color: 'var(--text-muted)' }}>
          No completed courses yet. Complete your enrolled courses to see grades here.
        </Typography.Paragraph>
      ) : (
        <>
          <Select
            style={{ width: 300 }}
            placeholder="Select a completed course"
            onChange={(value) => setSelectedId(value)}
          >
            {completedCourses.map((entry) => (
              <Option key={entry.course.id} value={entry.course.id}>
                {entry.course.code} - {entry.course.name}
              </Option>
            ))}
          </Select>

          {selectedEntry && (
            <Card style={{ marginTop: '30px', maxWidth: '500px', marginInline: 'auto' }}>
              <Title level={4}>
                {selectedEntry.course.code} - {selectedEntry.course.name}
              </Title>
              <p><strong>Numeric Score:</strong> {selectedEntry.score}/100</p>
              <p><strong>Swedish Grade:</strong> {convertToSwedishGrade(selectedEntry.score)}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                Grading scale: 0-49=U, 50-69=3, 70-84=4, 85-100=5
              </p>
            </Card>
          )}

          {/* Dice Game Integration */}
          {selectedEntry && selectedEntry.score !== null && (
            <RollTheDice
              key={selectedEntry.course.id}
              currentScore={convertToSwedishGrade(selectedEntry.score)}
              courseCode={selectedEntry.course.code}
            />
          )}
        </>
      )}
    </div>
  );
};
