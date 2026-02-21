export type AssessmentType = "Written exam" | "Oral exam" | "Individual project" | "Group project" | "Continuous assignments";

export type TagType =
  | "Theory-heavy"
  | "Practical"
  | "Research-oriented"
  | "Coding-intensive"
  | "Math-heavy"
  | "Group-based"
  | "Self-study friendly"
  | "Exam-focused";

export type StressLevel = "Low" | "Medium" | "High" | "Extreme";

export type RecommendForOption = "Ambitious students" | "Grade-focused students" | "Exchange students" | "Industry-oriented students";

export type GradeLetter = "A" | "B" | "C" | "D" | "E" | "U";

export interface EvaluationCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: string;
  timeSlots: string[];
}

export interface EvaluationSubmission {
  courseId: string;
  createdAtISO: string;
  workloadHoursPerWeek: number;
  difficulty7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stress4: StressLevel;
  lectureClarity7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  labUsefulness7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  feedbackQuality7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  organizationQuality7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  gradingStrictness7: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  assessmentTypes: AssessmentType[];
  tags: TagType[];
  wouldTakeAgain: boolean;
  recommendFor: RecommendForOption[];
  freeTextPros?: string;
  freeTextCons?: string;
}

export interface EvaluationAggregate {
  courseId: string;
  n: number;
  avgOverall5: number;
  avgWorkload: number;
  avgDifficulty7: number;
  avgStressScore: number;
  avgTeachingSupport7: number;
  avgGradingStrictness7: number;
  assessmentShare: Record<AssessmentType, number>;
  tagShare: Record<TagType, number>;
  recommendShare: Record<RecommendForOption, number>;
  wouldTakeAgainShare: number;
  topPros: string[];
  topCons: string[];
  gradeDistribution: Record<GradeLetter, number>;
}
