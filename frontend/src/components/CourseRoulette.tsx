import { useState, useMemo } from 'react';
import { Wheel } from 'react-custom-roulette';
import { Button, Typography, Card } from 'antd';
import type { Course } from '../types';
import { getColorForString } from '../shared';

const { Title, Paragraph } = Typography;

// Color palette for the wheel
const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D',
  '#06A77D', '#F19CBB', '#A8DADC', '#E76F51'
];

interface CourseRouletteProps {
  courses: Course[];
}

export const CourseRoulette = ({ courses }: CourseRouletteProps) => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Convert courses to wheel data format with deterministic colors
  // useMemo ensures colors don't change on re-renders
  const data = useMemo(
    () => courses.map((course) => ({
      option: course.courseCode,
      style: { 
        backgroundColor: getColorForString(course.name, WHEEL_COLORS),
        textColor: 'white',
      },
    })),
    [courses]
  );

  const handleSpinClick = () => {
    if (mustSpin) return;
    
    const newPrizeNumber = Math.floor(Math.random() * courses.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
    setSelectedCourse(null);
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    setSelectedCourse(courses[prizeNumber]);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          onStopSpinning={handleStopSpinning}
          backgroundColors={['#3e3e3e', '#df3428']}
          textColors={['#ffffff']}
          outerBorderColor="#333"
          outerBorderWidth={5}
          innerBorderColor="#333"
          radiusLineColor="#333"
          radiusLineWidth={2}
          fontSize={14}
        />
      </div>
      
      <Button 
        type="primary" 
        size="large" 
        onClick={handleSpinClick}
        disabled={mustSpin}
      >
        {mustSpin ? 'Spinning...' : 'SPIN THE WHEEL'}
      </Button>

      {selectedCourse && (
        <Card 
          style={{ 
            marginTop: '40px', 
            maxWidth: '600px', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }}
        >
          <Title level={3}>🎉 You got: {selectedCourse.courseCode} - {selectedCourse.name}!</Title>
          <Paragraph style={{ fontSize: '16px', marginTop: '16px' }}>
            {selectedCourse.description}
          </Paragraph>
          <Paragraph style={{ color: '#888' }}>
            <strong>Time Slot:</strong> {selectedCourse.time_slot}
          </Paragraph>
        </Card>
      )}
    </div>
  );
};
