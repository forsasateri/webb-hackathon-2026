import { Wheel } from 'react-custom-roulette';
import { Button, Typography, Card } from 'antd';
import { useMemo, useState } from 'react';

import { getColorForString } from '../../shared';

import type { Course } from '../../types';

// Color palette for the wheel
const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D',
  '#06A77D', '#F19CBB', '#A8DADC', '#E76F51'
];

interface CourseWheelProps {
  validCourses: Course[];
  setSelectedCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

export const CourseWheel = ({ validCourses, setSelectedCourses }: CourseWheelProps) => {
    const [mustSpin, setMustSpin] = useState(false);
    const [prizeNumber, setPrizeNumber] = useState(0);

    const data = useMemo(
        () => validCourses.map((course) => ({
        option: course.courseCode,
        style: { 
            backgroundColor: getColorForString(course.name, WHEEL_COLORS),
            textColor: 'white',
        },
        })),
        [validCourses]
    );

    const handleSpinClick = () => {
        if (mustSpin) return;
        
        const newPrizeNumber = Math.floor(Math.random() * validCourses.length);
        setPrizeNumber(newPrizeNumber);
        setMustSpin(true);
        //setSelectedCourses([]);
    };

    const handleStopSpinning = () => {
        setMustSpin(false);
        setSelectedCourses(prev => [...prev, validCourses[prizeNumber]]);
    };

    return (
        <>
        {validCourses.length === 0 ? (
            <Typography.Title level={2} style={{ marginTop: '50px' }}>
              No more valid courses to select! Please refresh to start over.
            </Typography.Title>
          ) : (
            <>
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
              spinDuration={0.2}
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
          </>
          )}
        </>
        )
    }