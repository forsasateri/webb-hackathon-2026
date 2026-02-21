import type { Course } from '../types';
import { getAuthToken } from './auth';
import { BASE_URL } from './base_url';

// schedule/enroll/:course_id
export const enrollInCourse = async (courseId: number): Promise<void> => {
    const response = await fetch(`${BASE_URL}/schedule/enroll/${courseId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}` // Assuming token is stored in localStorage after login
        }
    });

    if (!response.ok) {
        throw new Error('Failed to enroll in course');
    }

    return await response.json();
}

// schedule/drop/:course_id
export const dropCourse = async (courseId: number): Promise<void> => {
    const response = await fetch(`${BASE_URL}/schedule/drop/${courseId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}` // Assuming token is stored in localStorage after login
        }
    });

    if (!response.ok) {
        throw new Error('Failed to drop course');
    }

    return await response.json();
}

export const getSchedule = async (): Promise<Course[]> => {
    const response = await fetch(`${BASE_URL}/schedule`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch schedule');
    }

    const data = await response.json();
    return data.courses; // TODO: Need to verify what is returned. Courses?
}