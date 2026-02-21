import type { Course } from '../types';
import { BASE_URL } from './base_url';

const extraFilterCourse = (course: Course) => {
  const newTimeSlots = course.time_slots.map(ts => ({
      id: ts.id,
      period: ts.period % 2 + 1,
      slot: ts.slot % 2 + 1
    }));

    return {
      ...course,
      time_slots: newTimeSlots
    };
  }

const extraFilterCourses = (courses: Course[]) => {
  return courses.map(course => extraFilterCourse(course));
}

/**
 * Fetch all available courses from /courses endpoint
 */
export const getAllCourses = async (): Promise<Course[]> => {
  const response = await fetch(`${BASE_URL}/courses`);
  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }
  const data = await response.json();
  const courses: Course[] = data.courses; // Stupid backend, should just return the list directly without nesting it in an object but whatever. NOTE: This comment was made by AI :D
  return extraFilterCourses(courses);
};

/**
 * Fetch a single course by ID
 */
export const getCourseById = async (id: number): Promise<Course | undefined> => {
  const response = await fetch(`${BASE_URL}/courses/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }
  const courseData = await response.json();
  return extraFilterCourse(courseData);
};

// /**
//  * Fetch courses by time slot
//  */
// export const getCoursesByTimeSlot = async (timeSlot: number): Promise<Course[]> => {
//   // Simulate API delay
//   await new Promise((resolve) => setTimeout(resolve, 250));
//   return mockCourses.filter((course) => course.time_slot === timeSlot);
// };
