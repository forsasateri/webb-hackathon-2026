import { Wheel } from 'react-custom-roulette';
import { Button, Typography, Card } from 'antd';
import { useMemo, useState } from 'react';

import { getColorForCourse } from '../../shared';

import type { Course } from '../../types';

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
            backgroundColor: getColorForCourse(course),
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