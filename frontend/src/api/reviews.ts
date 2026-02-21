import { BASE_URL } from "./base_url";
import { getAuthToken } from "./auth";

// courses/:courseID/reviews
export const getCourseReviews = async (courseId: number): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/reviews`);
    if (!response.ok) {
        throw new Error('Failed to fetch course reviews');
    }
    const data = await response.json();
    return data.reviews; // Assuming the backend returns { reviews: [...] }
}

// Add new
export const addCourseReview = async (courseId: number, rating: number, comment: string): Promise<void> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ rating, comment })
    });

    if (!response.ok) {
        throw new Error('Failed to add course review');
    }

    return await response.json();
}


// Delete review
export const deleteCourseReview = async (courseId: number, reviewId: number): Promise<void> => {
    const response = await fetch(`${BASE_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete course review');
    }

    return await response.json();
}