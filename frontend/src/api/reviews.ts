import { BASE_URL } from "./base_url";
import { getAuthToken } from "./auth";

export interface ReviewResponse {
    id: number;
    user_id: number;
    username: string;
    course_id: number;
    workload: number;
    difficulty: number;
    practicality: number;
    grading: number;
    teaching_quality: number;
    interest: number;
    comment: string | null;
    created_at: string;
}

export interface ReviewsData {
    reviews: ReviewResponse[];
    avg_workload: number | null;
    avg_difficulty: number | null;
    avg_practicality: number | null;
    avg_grading: number | null;
    avg_teaching_quality: number | null;
    avg_interest: number | null;
    total: number;
}

export interface ReviewCreatePayload {
    workload: number;
    difficulty: number;
    practicality: number;
    grading: number;
    teaching_quality: number;
    interest: number;
    comment?: string;
}

// GET /api/courses/:courseID/reviews
export const getCourseReviews = async (courseId: number): Promise<ReviewsData> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/reviews`);
    if (!response.ok) {
        throw new Error('Failed to fetch course reviews');
    }
    const data = await response.json();
    return data;
}

// POST /api/courses/:courseID/reviews
export const addCourseReview = async (courseId: number, payload: ReviewCreatePayload): Promise<ReviewResponse> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error: any = new Error(errorData?.detail || 'Failed to add course review');
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return await response.json();
}


// DELETE /api/reviews/:reviewId
export const deleteCourseReview = async (reviewId: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error: any = new Error(errorData?.detail || 'Failed to delete course review');
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return await response.json();
}