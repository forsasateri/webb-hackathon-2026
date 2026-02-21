import type {
  EvaluationCourse,
  EvaluationSubmission,
  EvaluationAggregate,
  AssessmentType,
  TagType,
  RecommendForOption,
  StressLevel,
  GradeLetter,
} from '../types';

// Mock courses
export const mockEvaluationCourses: EvaluationCourse[] = [
  {
    id: 'course-tdde66',
    code: 'TDDE66',
    name: 'Software Engineering and Project Management',
    credits: 6,
    semester: '2025 Autumn',
    timeSlots: ['Mon-10-12', 'Wed-14-16'],
  },
  {
    id: 'course-cs201',
    code: 'CS201',
    name: 'Data Structures and Algorithms',
    credits: 7,
    semester: '2025 Autumn',
    timeSlots: ['Tue-08-10', 'Thu-13-15'],
  },
  {
    id: 'course-web305',
    code: 'WEB305',
    name: 'Advanced Web Development',
    credits: 6,
    semester: '2025 Spring',
    timeSlots: ['Mon-13-15', 'Fri-10-12'],
  },
];

const assessmentTypes: AssessmentType[] = [
  'Written exam',
  'Oral exam',
  'Individual project',
  'Group project',
  'Continuous assignments',
];

const allTags: TagType[] = [
  'Theory-heavy',
  'Practical',
  'Research-oriented',
  'Coding-intensive',
  'Math-heavy',
  'Group-based',
  'Self-study friendly',
  'Exam-focused',
];

const recommendOptions: RecommendForOption[] = [
  'Ambitious students',
  'Grade-focused students',
  'Exchange students',
  'Industry-oriented students',
];

const stressLevels: StressLevel[] = ['Low', 'Medium', 'High', 'Extreme'];

const prosSamples = [
  'Great lectures with clear explanations',
  'Interesting group project',
  'Helpful teaching assistants',
  'Well-structured course materials',
  'Practical assignments',
  'Good balance of theory and practice',
  'Engaging professor',
  'Useful for career development',
  'Learned a lot about teamwork',
  'Fair grading criteria',
];

const consSamples = [
  'Too much workload',
  'Unclear examination requirements',
  'Group project was chaotic',
  'Labs were not well organized',
  'Too much self-study required',
  'Lectures were sometimes boring',
  'Not enough feedback on assignments',
  'Tight deadlines',
  'Poor communication from teachers',
  'Difficult to get help when needed',
];

// Generate deterministic mock submissions for TDDE66
function generateMockSubmissions(courseId: string, count: number): EvaluationSubmission[] {
  const submissions: EvaluationSubmission[] = [];

  for (let i = 0; i < count; i++) {
    const seed = i * 137;
    const rand = (n: number) => (seed * 9301 + 49297) % 233280 / 233280 * n;

    // Select 2 random tags
    const shuffledTags = [...allTags].sort(() => rand(2) - 1);
    const selectedTags = shuffledTags.slice(0, 2) as TagType[];

    // Select 1-3 assessment types
    const numAssessments = Math.floor(rand(3)) + 1;
    const shuffledAssessments = [...assessmentTypes].sort(() => rand(2) - 1);
    const selectedAssessments = shuffledAssessments.slice(0, numAssessments) as AssessmentType[];

    // Select 0-3 recommend for options
    const numRecommend = Math.floor(rand(4));
    const shuffledRecommend = [...recommendOptions].sort(() => rand(2) - 1);
    const selectedRecommend = shuffledRecommend.slice(0, numRecommend) as RecommendForOption[];

    const submission: EvaluationSubmission = {
      courseId,
      createdAtISO: new Date(2025, 0, 15 + (i % 30)).toISOString(),
      workloadHoursPerWeek: Math.floor(rand(40)) + 5,
      difficulty7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      stress4: stressLevels[Math.floor(rand(4))],
      lectureClarity7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      labUsefulness7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      feedbackQuality7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      organizationQuality7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      gradingStrictness7: (Math.floor(rand(7)) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      assessmentTypes: selectedAssessments,
      tags: selectedTags,
      wouldTakeAgain: rand(10) < 6, // 60% would take again
      recommendFor: selectedRecommend,
      freeTextPros: rand(3) < 2 ? prosSamples[Math.floor(rand(prosSamples.length))] : undefined,
      freeTextCons: rand(3) < 2 ? consSamples[Math.floor(rand(consSamples.length))] : undefined,
    };

    submissions.push(submission);
  }

  return submissions;
}

// Generate submissions for TDDE66 (n=37)
export const mockSubmissions: EvaluationSubmission[] = generateMockSubmissions('course-tdde66', 37);

// Compute aggregate from submissions
function computeAggregate(
  courseId: string,
  submissions: EvaluationSubmission[]
): EvaluationAggregate {
  const n = submissions.length;

  // Average calculations
  const avgWorkload =
    submissions.reduce((sum, s) => sum + s.workloadHoursPerWeek, 0) / n;
  const avgDifficulty7 =
    submissions.reduce((sum, s) => sum + s.difficulty7, 0) / n;

  const stressMap: Record<StressLevel, number> = { Low: 1, Medium: 2, High: 3, Extreme: 4 };
  const avgStressScore =
    submissions.reduce((sum, s) => sum + stressMap[s.stress4], 0) / n;

  const avgTeachingSupport7 =
    submissions.reduce(
      (sum, s) => sum + s.lectureClarity7 + s.labUsefulness7 + s.feedbackQuality7 + s.organizationQuality7,
      0
    ) /
    (n * 4);

  const avgGradingStrictness7 =
    submissions.reduce((sum, s) => sum + s.gradingStrictness7, 0) / n;

  // Overall score computed from difficulty, stress, and teaching support
  const avgOverall5 = Math.min(
    5,
    Math.max(
      1,
      (avgTeachingSupport7 * 5) / 7 -
        (avgDifficulty7 - 4) * 0.3 -
        (avgStressScore - 2) * 0.2
    )
  );

  // Assessment type distribution
  const assessmentCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    s.assessmentTypes.forEach((type) => {
      assessmentCounts[type] = (assessmentCounts[type] || 0) + 1;
    });
  });
  const assessmentShare: Record<AssessmentType, number> = {} as Record<AssessmentType, number>;
  assessmentTypes.forEach((type) => {
    assessmentShare[type] = Math.round(((assessmentCounts[type] || 0) / n) * 100);
  });
  // Normalize to 100%
  const assessmentSum = Object.values(assessmentShare).reduce((a, b) => a + b, 0);
  if (assessmentSum > 0) {
    const firstKey = Object.keys(assessmentShare)[0] as AssessmentType;
    assessmentShare[firstKey] += 100 - assessmentSum;
  }

  // Tag distribution
  const tagCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    s.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const tagShare: Record<TagType, number> = {} as Record<TagType, number>;
  allTags.forEach((tag) => {
    tagShare[tag] = Math.round(((tagCounts[tag] || 0) / (n * 2)) * 100); // Each submission has 2 tags
  });
  // Normalize to 100%
  const tagSum = Object.values(tagShare).reduce((a, b) => a + b, 0);
  if (tagSum > 0) {
    const sortedTags = Object.entries(tagShare).sort((a, b) => b[1] - a[1]);
    const topTag = sortedTags[0]?.[0] as TagType;
    if (topTag) tagShare[topTag] += 100 - tagSum;
  }

  // Recommend for distribution
  const recommendCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    s.recommendFor.forEach((opt) => {
      recommendCounts[opt] = (recommendCounts[opt] || 0) + 1;
    });
  });
  const recommendShare: Record<RecommendForOption, number> = {} as Record<RecommendForOption, number>;
  recommendOptions.forEach((opt) => {
    recommendShare[opt] = Math.round(((recommendCounts[opt] || 0) / n) * 100);
  });

  // Would take again percentage
  const wouldTakeAgainShare = Math.round(
    (submissions.filter((s) => s.wouldTakeAgain).length / n) * 100
  );

  // Top pros and cons (from free text)
  const prosFrequency: Record<string, number> = {};
  const consFrequency: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.freeTextPros) {
      prosFrequency[s.freeTextPros] = (prosFrequency[s.freeTextPros] || 0) + 1;
    }
    if (s.freeTextCons) {
      consFrequency[s.freeTextCons] = (consFrequency[s.freeTextCons] || 0) + 1;
    }
  });
  const topPros = Object.entries(prosFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text]) => text);
  const topCons = Object.entries(consFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text]) => text);

  // Grade distribution (mock data - not from submissions)
  const gradeDistribution: Record<GradeLetter, number> = {
    A: 15,
    B: 30,
    C: 25,
    D: 15,
    E: 10,
    U: 5,
  };

  return {
    courseId,
    n,
    avgOverall5: Math.round(avgOverall5 * 10) / 10,
    avgWorkload: Math.round(avgWorkload * 10) / 10,
    avgDifficulty7: Math.round(avgDifficulty7 * 10) / 10,
    avgStressScore: Math.round(avgStressScore * 10) / 10,
    avgTeachingSupport7: Math.round(avgTeachingSupport7 * 10) / 10,
    avgGradingStrictness7: Math.round(avgGradingStrictness7 * 10) / 10,
    assessmentShare,
    tagShare,
    recommendShare,
    wouldTakeAgainShare,
    topPros: topPros.length > 0 ? topPros : prosSamples.slice(0, 3),
    topCons: topCons.length > 0 ? topCons : consSamples.slice(0, 3),
    gradeDistribution,
  };
}

// Create hardcoded aggregates for all courses
export const mockAggregates: EvaluationAggregate[] = [
  computeAggregate('course-tdde66', mockSubmissions),
  {
    courseId: 'course-cs201',
    n: 52,
    avgOverall5: 3.8,
    avgWorkload: 18.5,
    avgDifficulty7: 5.2,
    avgStressScore: 2.8,
    avgTeachingSupport7: 4.5,
    avgGradingStrictness7: 5.1,
    assessmentShare: {
      'Written exam': 60,
      'Oral exam': 5,
      'Individual project': 20,
      'Group project': 0,
      'Continuous assignments': 15,
    },
    tagShare: {
      'Theory-heavy': 45,
      Practical: 20,
      'Research-oriented': 15,
      'Coding-intensive': 25,
      'Math-heavy': 40,
      'Group-based': 5,
      'Self-study friendly': 30,
      'Exam-focused': 50,
    },
    recommendShare: {
      'Ambitious students': 70,
      'Grade-focused students': 40,
      'Exchange students': 30,
      'Industry-oriented students': 50,
    },
    wouldTakeAgainShare: 65,
    topPros: ['Excellent problem sets', 'Clear lecture materials', 'Helpful office hours'],
    topCons: ['Very challenging exams', 'Heavy math workload', 'Limited lab time'],
    gradeDistribution: { A: 20, B: 35, C: 25, D: 12, E: 5, U: 3 },
  },
  {
    courseId: 'course-web305',
    n: 28,
    avgOverall5: 4.2,
    avgWorkload: 12.3,
    avgDifficulty7: 3.5,
    avgStressScore: 2.1,
    avgTeachingSupport7: 5.8,
    avgGradingStrictness7: 3.2,
    assessmentShare: {
      'Written exam': 10,
      'Oral exam': 0,
      'Individual project': 40,
      'Group project': 30,
      'Continuous assignments': 20,
    },
    tagShare: {
      'Theory-heavy': 10,
      Practical: 60,
      'Research-oriented': 5,
      'Coding-intensive': 55,
      'Math-heavy': 5,
      'Group-based': 45,
      'Self-study friendly': 40,
      'Exam-focused': 15,
    },
    recommendShare: {
      'Ambitious students': 50,
      'Grade-focused students': 60,
      'Exchange students': 70,
      'Industry-oriented students': 85,
    },
    wouldTakeAgainShare: 82,
    topPros: ['Hands-on projects', 'Modern tech stack', 'Portfolio building'],
    topCons: ['Group work coordination', 'Rapid pace', 'Vague project requirements'],
    gradeDistribution: { A: 25, B: 40, C: 20, D: 10, E: 3, U: 2 },
  },
];

// Helper functions
export const getEvaluationCourseById = (id: string): EvaluationCourse | undefined => {
  return mockEvaluationCourses.find((c) => c.id === id);
};

export const getEvaluationAggregateByCourseId = (courseId: string): EvaluationAggregate | undefined => {
  return mockAggregates.find((a) => a.courseId === courseId);
};
