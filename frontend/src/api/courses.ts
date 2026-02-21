import type { Course } from '../types';
import { BASE_URL } from './base_url';

// Pass through course data as-is from backend.
// Backend period range: 1-8, slot range: 1-4. No transformation needed.
const extraFilterCourse = (course: Course): Course => {
  return course;
}

const extraFilterCourses = (courses: Course[]): Course[] => {
  return courses;
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
