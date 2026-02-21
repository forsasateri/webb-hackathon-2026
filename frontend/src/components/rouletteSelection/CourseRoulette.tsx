import { useState, useMemo } from 'react';
import type { Course } from '../../types';

import { SelectedCourse } from './selectedCourse';
import { CourseWheel } from './CourseWheel';

// Filter out all courses with same time slot as the currently selected courses to prevent time conflicts. If no courses are selected, return all courses.
const filterValidCourses = (courses: Course[], selectedCourses: Course[]) => {
  if (selectedCourses.length === 0) return courses;

  // We identify every unique time slot by period and slot

  const selectedTimeSlots = new Set<string>();
  selectedCourses.forEach(course => {
    course.time_slots.forEach(ts => {
      selectedTimeSlots.add(`${ts.period}-${ts.slot}`);
    });
  });

  return courses.filter(course => {
    return !course.time_slots.some(ts => selectedTimeSlots.has(`${ts.period}-${ts.slot}`));
  });

};

interface CourseRouletteProps {
  courses: Course[];
}

export const CourseRoulette = ({ courses }: CourseRouletteProps) => {

  
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const validCourses = filterValidCourses(courses, selectedCourses);

  // Convert courses to wheel data format with deterministic colors
  // useMemo ensures colors don't change on re-renders

  return (
    <div style={{ textAlign: 'center' }}>
      
      <CourseWheel validCourses={validCourses} setSelectedCourses={setSelectedCourses} />

      {selectedCourses.length > 0 && (
        selectedCourses.map(course => <SelectedCourse key={course.id} course={course} />)
      )}
    </div>
  );
};
