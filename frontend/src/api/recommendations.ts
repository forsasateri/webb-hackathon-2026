import { BASE_URL } from "./base_url";

export interface RecommendedCourse {
    id: number;
    code: string;
    name: string;
    credits: number;
    co_enroll_count: number;
}

export interface RecommendationsData {
    course_id: number;
    recommendations: RecommendedCourse[];
}

// GET /api/courses/:course_id/recommend
export const getCourseRecommendations = async (courseId: number): Promise<RecommendationsData> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/recommend`);
    if (!response.ok) {
        throw new Error('Failed to fetch course recommendations');
    }
    const data = await response.json();
    return data;
}