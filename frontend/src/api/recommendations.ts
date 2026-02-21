import { BASE_URL } from "./base_url";

// /courses/:course_id/recommend
export const getCourseRecommendations = async (courseId: number): Promise<any[]> => {
    const response = await fetch(`${BASE_URL}/courses/${courseId}/recommend`);
    if (!response.ok) {
        throw new Error('Failed to fetch course recommendations');
    }
    const data = await response.json();

    // Backend returns object with 
    // {
    //     "course_id": courseId,
    //     "recommendations": Course[]
    // }

    return data.recommendations;
}