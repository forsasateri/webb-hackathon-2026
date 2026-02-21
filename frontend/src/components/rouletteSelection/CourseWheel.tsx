import { Wheel } from 'react-custom-roulette';
import { Typography } from 'antd';
import { useMemo } from 'react';

import { getColorForCourse } from '../../shared';

import type { Course } from '../../types';

interface CourseWheelProps {
  validCourses: Course[];
  mustSpin: boolean;
  prizeNumber: number;
  onStopSpinning: () => void;
}

export const CourseWheel = ({ validCourses, mustSpin, prizeNumber, onStopSpinning }: CourseWheelProps) => {
    const data = useMemo(
        () => validCourses.map((course) => ({
        option: course.code,
        style: { 
            backgroundColor: getColorForCourse(course),
            textColor: 'white',
        },
        })),
        [validCourses]
    );

    if (validCourses.length === 0) {
      return (
        <Typography.Title level={2} style={{ marginTop: '50px' }}>
          No more valid courses to select! Please refresh to start over.
        </Typography.Title>
      );
    }

    return (
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={data}
        onStopSpinning={onStopSpinning}
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
    );
}