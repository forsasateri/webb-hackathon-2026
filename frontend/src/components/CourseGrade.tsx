import { Card, Typography, Select, Button } from 'antd';
import { useState } from 'react';
import type { ScheduleEntry } from '../api/enrollment';
import { RollTheDice } from './rollTheDice';

const { Title, Text } = Typography;
const { Option } = Select;

// Convert numeric score (0-100) to grade (U/3/4/5)
const convertToGrade = (score: number | null): string => {
  if (score === null) return 'In Progress';
  if (score < 50) return 'U';
  if (score < 70) return '3';
  if (score < 85) return '4';
  return '5';
};

interface GradesPageProps {
  scheduleEntries: ScheduleEntry[];
  onScheduleChanged?: () => Promise<void>;
}

export const GradesPage = ({ scheduleEntries, onScheduleChanged }: GradesPageProps) => {
  // Filter for completed courses (finished_status = true)
  const completedCourses = scheduleEntries.filter(
    (entry) => entry.finished_status
  );
  const panelWidth = 'min(760px, calc(100vw - 32px))';
  const selectWidth = 'min(560px, calc(100vw - 32px))';

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDiceGame, setShowDiceGame] = useState(false);

  const selectedEntry = completedCourses.find(
    (entry) => entry.course.id === selectedId
  );
  const currentScore = selectedEntry
    ? (selectedEntry.dice_summary?.current_score ?? selectedEntry.score)
    : null;
  const originalScore = selectedEntry
    ? (selectedEntry.dice_summary?.original_score ?? currentScore)
    : null;
  const currentGrade = convertToGrade(currentScore);

  const handleCourseChange = (value: number) => {
    setSelectedId(value);
    setShowDiceGame(false); // Hide dice game when course changes
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '32px' }}>
      <Title level={2} style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>My Grades</Title>

      {completedCourses.length === 0 ? (
        <Typography.Paragraph style={{ fontSize: '16px', marginTop: '20px', color: 'var(--text-muted)' }}>
          No completed courses yet. Complete your enrolled courses to see grades here.
        </Typography.Paragraph>
      ) : (
        <>
          <Select
            style={{ width: selectWidth }}
            placeholder="Select a completed course"
            onChange={handleCourseChange}
          >
            {completedCourses.map((entry) => (
              <Option key={entry.course.id} value={entry.course.id}>
                {entry.course.code} - {entry.course.name}
              </Option>
            ))}
          </Select>

          {selectedEntry && (
            <Card style={{ marginTop: '30px', width: panelWidth, marginInline: 'auto' }}>
              <Title level={4}>
                {selectedEntry.course.code} - {selectedEntry.course.name}
              </Title>
              <Title
                level={2}
                style={{
                  marginTop: 4,
                  marginBottom: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Grade: {currentGrade}
              </Title>
              <Text style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>
                {originalScore !== null ? `Original Score: ${originalScore}/100` : 'Original Score: N/A'}
              </Text>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                Grading scale: 0-49=U, 50-69=3, 70-84=4, 85-100=5
              </p>
            </Card>
          )}

          {/* "I'm Feeling Lucky" Button */}
          {selectedEntry && !showDiceGame && (
            <Button
              type="default"
              style={{ marginTop: '20px' }}
              onClick={() => setShowDiceGame(true)}
            >
              I'm Feeling Lucky
            </Button>
          )}

          {/* Dice Game Integration */}
          {selectedEntry && currentScore !== null && showDiceGame && (
            <RollTheDice
              key={selectedEntry.course.id}
              courseId={selectedEntry.course.id}
              currentScore={currentScore}
              courseCode={selectedEntry.course.code}
              diceSummary={selectedEntry.dice_summary}
              diceHistory={selectedEntry.dice_history}
              onRollCommitted={onScheduleChanged}
            />
          )}
        </>
      )}
    </div>
  );
};
