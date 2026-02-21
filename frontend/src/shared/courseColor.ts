import type { Course } from "../types";
import { hashString } from "./hash";

// Color palette for the wheel
const COURSE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D',
  '#06A77D', '#F19CBB', '#A8DADC', '#E76F51',
  '#F4A261', '#E9C46A', '#264653',
  '#6A0572', '#B5179E', '#720026', '#CE4257', '#3A0CA3',
];


/**
 * Get a deterministic color for a given string
 * Always returns the same color for the same input
 */
export const getColorForCourse = (course: Course): string => {
  const hash = hashString(course.code + course.name);
  const index = hash % COURSE_COLORS.length;
  return COURSE_COLORS[index];
};