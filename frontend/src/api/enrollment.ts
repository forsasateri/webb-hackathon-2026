import type { Course } from '../types';
import { getAuthToken } from './auth';
import { BASE_URL } from './base_url';

// Types for schedule API responses
export interface DiceSummary {
    max_attempts: number;
    attempts_used: number;
    attempts_left: number;
    original_score: number | null;
    current_score: number | null;
    last_roll_at: string | null;
}

export interface EnrollmentDiceStatePlan {
    position: [number, number, number];
    target: [number, number, number];
    direction: [number, number, number];
    speed: number;
    velocity: [number, number, number];
    angular_velocity: [number, number, number];
    rotation_euler: [number, number, number];
}

export interface EnrollmentDiceLaunchPlan {
    face_layout: string[];
    dice_states: EnrollmentDiceStatePlan[];
}

export interface DiceHistoryEntry {
    roll_id: number;
    attempt_number: number;
    status: string;
    score_before: number;
    score_after: number;
    grade_before: string;
    grade_after: string;
    dice_values: string[];
    average: number;
    total: number;
    launch_plan: EnrollmentDiceLaunchPlan | null;
    created_at: string;
    finalized_at: string | null;
}

export interface ScheduleEntry {
    enrollment_id: number;
    course: Course;
    enrolled_at: string;
    finished_status: boolean;
    score: number | null;
    dice_summary: DiceSummary;
    dice_history: DiceHistoryEntry[];
}

export interface ScheduleResponse {
    schedule: ScheduleEntry[];
    total_credits: number;
}

export interface EnrollResponse {
    message: string;
    enrollment: {
        enrollment_id: number;
        user_id: number;
        course_id: number;
        enrolled_at: string;
    };
}

export interface ConflictDetail {
    period: number;
    slot: number;
    conflicting_course_id: number;
    conflicting_course_name: string;
}

// schedule/enroll/:course_id
export const enrollInCourse = async (courseId: number): Promise<EnrollResponse> => {
    const response = await fetch(`${BASE_URL}/schedule/enroll/${courseId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error: any = new Error(errorData?.detail || 'Failed to enroll in course');
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return await response.json();
}

// schedule/drop/:course_id
export const dropCourse = async (courseId: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/schedule/drop/${courseId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error: any = new Error(errorData?.detail || 'Failed to drop course');
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return await response.json();
}

// GET /api/schedule - returns { schedule: ScheduleEntry[], total_credits: number }
export const getSchedule = async (): Promise<ScheduleResponse> => {
    const response = await fetch(`${BASE_URL}/schedule`, {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch schedule');
    }

    const data: ScheduleResponse = await response.json();
    return data; // Returns full { schedule: ScheduleEntry[], total_credits }
}
