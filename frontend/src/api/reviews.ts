import { BASE_URL } from "./base_url";
import { getAuthToken } from "./auth";

export interface ReviewResponse {
    id: number;
    user_id: number;
    username: string;
    course_id: number;
    rating: number;
    comment: string;
    created_at: string;
}

export interface ReviewsData {
    reviews: ReviewResponse[];
    avg_rating: number | null;
    total: number;
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
export const addCourseReview = async (courseId: number, rating: number, comment: string): Promise<ReviewResponse> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ rating, comment })
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