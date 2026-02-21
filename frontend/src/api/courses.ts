import type { Course } from '../types';

// Mock data for testing
const mockCourses: Course[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    courseCode: 'CS101',
    name: 'Introduction to Computer Science',
    description: 'Learn the fundamentals of computer science including algorithms, data structures, and programming concepts.',
    time_slot: 1,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    courseCode: 'MATH301',
    name: 'Advanced Mathematics',
    description: 'Explore advanced mathematical concepts including calculus, linear algebra, and differential equations.',
    time_slot: 2,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    courseCode: 'WEB202',
    name: 'Web Development',
    description: 'Build modern web applications using React, TypeScript, and other cutting-edge technologies.',
    time_slot: 3,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    courseCode: 'DB205',
    name: 'Database Systems',
    description: 'Learn about relational databases, SQL, NoSQL databases, and database design principles.',
    time_slot: 4,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    courseCode: 'ML401',
    name: 'Machine Learning',
    description: 'Introduction to machine learning algorithms, neural networks, and artificial intelligence.',
    time_slot: 1,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    courseCode: 'SE301',
    name: 'Software Engineering',
    description: 'Best practices in software development, testing, deployment, and project management.',
    time_slot: 2,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    courseCode: 'PHY101',
    name: 'Physics I',
    description: 'Introduction to classical mechanics, thermodynamics, and wave phenomena.',
    time_slot: 3,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    courseCode: 'CHEM150',
    name: 'General Chemistry',
    description: 'Fundamental principles of chemistry including atomic structure, bonding, and chemical reactions.',
    time_slot: 4,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    courseCode: 'HIST220',
    name: 'World History',
    description: 'Survey of major events, movements, and civilizations throughout human history.',
    time_slot: 1,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    courseCode: 'ENG105',
    name: 'English Composition',
    description: 'Develop writing skills through various genres including essays, research papers, and creative writing.',
    time_slot: 2,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    courseCode: 'BIO201',
    name: 'Cell Biology',
    description: 'Study of cell structure, function, and molecular processes essential to life.',
    time_slot: 3,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    courseCode: 'ECON101',
    name: 'Microeconomics',
    description: 'Analysis of individual and firm behavior in markets, supply and demand, and market structures.',
    time_slot: 4,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    courseCode: 'PSY100',
    name: 'Introduction to Psychology',
    description: 'Overview of human behavior, cognition, emotion, and mental processes.',
    time_slot: 1,
    enrolled: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    courseCode: 'ART110',
    name: 'Art History',
    description: 'Exploration of art movements, styles, and major works from ancient to contemporary periods.',
    time_slot: 2,
    enrolled: true,
    score: "39"
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    courseCode: 'MUS120',
    name: 'Music Theory',
    description: 'Study of musical notation, harmony, melody, rhythm, and compositional techniques.',
    time_slot: 3,
    enrolled: true,
    score: "93"
  },
];

/**
 * Fetch all available courses
 */
export const getAllCourses = async (): Promise<Course[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCourses;
};

/**
 * Fetch a single course by ID
 */
export const getCourseById = async (id: string): Promise<Course | undefined> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockCourses.find((course) => course.id === id);
};

/**
 * Fetch courses by time slot
 */
export const getCoursesByTimeSlot = async (timeSlot: number): Promise<Course[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 250));
  return mockCourses.filter((course) => course.time_slot === timeSlot);
};
