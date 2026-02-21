import { Card, Typography, Select } from 'antd';
import { useState } from 'react';
import type { Course } from '../types';
import { RollTheDice } from './rollTheDice';

const { Title } = Typography;
const { Option } = Select;

interface GradesPageProps {
  courses: Course[];
}

export const GradesPage = ({ courses }: GradesPageProps) => {
  const completedCourses = courses.filter(
    (course) => course.enrolled
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedCourse = completedCourses.find(
    (c) => c.id === selectedId
  );

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <Title level={2}>My Grades</Title>

      <Select
        style={{ width: 300 }}
        placeholder="Select a completed course"
        onChange={(value) => setSelectedId(value)}
      >
        {completedCourses.map((course) => (
          <Option key={course.id} value={course.id}>
            {course.code}
          </Option>
        ))}
      </Select>

      {selectedCourse && (
        <Card style={{ marginTop: '30px', maxWidth: '500px', marginInline: 'auto' }}>
          <Title level={4}>
            {selectedCourse.code} - {selectedCourse.name}
          </Title>
          <p><strong>Grade:</strong> {selectedCourse.score}</p>
        </Card>
      )}

      {/* Dice Game Integration */}
      {selectedCourse && (
        <RollTheDice
          key={selectedCourse.id}
          currentScore={selectedCourse.score}
          courseCode={selectedCourse.courseCode}
        />
      )}
    </div>
  );
};
