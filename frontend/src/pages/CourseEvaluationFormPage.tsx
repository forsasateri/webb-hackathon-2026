import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Slider,
  Radio,
  Checkbox,
  Button,
  Space,
  Tag,
  Alert,
  Row,
  Col,
} from 'antd';
import type { EvaluationSubmission, TagType, AssessmentType, RecommendForOption, StressLevel } from '../types';
import { getEvaluationCourseById } from '../mock';

const { Title, Text } = Typography;
const { TextArea } = Input;
import { Input } from 'antd';

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

const assessmentTypes: AssessmentType[] = [
  'Written exam',
  'Oral exam',
  'Individual project',
  'Group project',
  'Continuous assignments',
];

const recommendOptions: RecommendForOption[] = [
  'Ambitious students',
  'Grade-focused students',
  'Exchange students',
  'Industry-oriented students',
];

export const CourseEvaluationFormPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = courseId ? getEvaluationCourseById(courseId) : undefined;

  // Form state
  const [workload, setWorkload] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [stress, setStress] = useState<StressLevel | null>(null);
  const [lectureClarity, setLectureClarity] = useState<number | null>(null);
  const [labUsefulness, setLabUsefulness] = useState<number | null>(null);
  const [feedbackQuality, setFeedbackQuality] = useState<number | null>(null);
  const [organizationQuality, setOrganizationQuality] = useState<number | null>(null);
  const [selectedAssessments, setSelectedAssessments] = useState<AssessmentType[]>([]);
  const [gradingStrictness, setGradingStrictness] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [selectedRecommend, setSelectedRecommend] = useState<RecommendForOption[]>([]);
  const [freeTextPros, setFreeTextPros] = useState('');
  const [freeTextCons, setFreeTextCons] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!course) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
        <Alert message="Course not found" type="error" />
      </div>
    );
  }

  const handleTagChange = (tag: TagType, checked: boolean) => {
    if (checked) {
      if (selectedTags.length >= 2) {
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    } else {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (difficulty === null) errors.push('Please select a difficulty rating');
    if (stress === null) errors.push('Please select a stress level');
    if (lectureClarity === null) errors.push('Please rate lecture clarity');
    if (labUsefulness === null) errors.push('Please rate lab usefulness');
    if (feedbackQuality === null) errors.push('Please rate feedback quality');
    if (organizationQuality === null) errors.push('Please rate organization quality');
    if (selectedAssessments.length === 0) errors.push('Please select at least one assessment type');
    if (gradingStrictness === null) errors.push('Please select grading strictness');
    if (selectedTags.length !== 2) errors.push('Please select exactly 2 tags');
    if (wouldTakeAgain === null) errors.push('Please indicate if you would take this course again');
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length === 0) {
      const submission: EvaluationSubmission = {
        courseId: course.id,
        createdAtISO: new Date().toISOString(),
        workloadHoursPerWeek: workload,
        difficulty7: difficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        stress4: stress as StressLevel,
        lectureClarity7: lectureClarity as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        labUsefulness7: labUsefulness as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        feedbackQuality7: feedbackQuality as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        organizationQuality7: organizationQuality as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        gradingStrictness7: gradingStrictness as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        assessmentTypes: selectedAssessments,
        tags: selectedTags,
        wouldTakeAgain: wouldTakeAgain as boolean,
        recommendFor: selectedRecommend,
        freeTextPros: freeTextPros || undefined,
        freeTextCons: freeTextCons || undefined,
      };

      console.log('Submission:', submission);
      setShowSuccess(true);
      window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {showSuccess && (
        <Alert
          message="Thanks! Your evaluation has been recorded (mock)."
          type="success"
          closable
          onClose={() => setShowSuccess(false)}
          style={{ marginBottom: 24 }}
        />
      )}

      {validationErrors.length > 0 && (
        <Alert
          message="Please fix the following errors:"
          description={
            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          }
          type="error"
          style={{ marginBottom: 24 }}
        />
      )}

      <Title level={2}>Course evaluation</Title>
      <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
        {course.code} — {course.name} · {course.credits} credits · {course.semester}
      </Text>
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">Time slots: </Text>
        {course.timeSlots.map((slot) => (
          <Tag key={slot} style={{ marginRight: 8 }}>
            {slot}
          </Tag>
        ))}
      </div>

      {/* Section 1: Workload & difficulty */}
      <Card title="Workload & difficulty" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Average study hours per week</Text>
            <Text>{workload} h/week</Text>
          </div>
          <Slider
            min={0}
            max={60}
            value={workload}
            onChange={setWorkload}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Perceived difficulty
          </Text>
          <Radio.Group
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <Space>
              {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                <Radio.Button key={v} value={v}>
                  {v}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            1 = Very easy, 7 = Very hard
          </Text>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Stress level
          </Text>
          <Radio.Group
            value={stress}
            onChange={(e) => setStress(e.target.value)}
          >
            <Space>
              <Radio.Button value="Low">Low</Radio.Button>
              <Radio.Button value="Medium">Medium</Radio.Button>
              <Radio.Button value="High">High</Radio.Button>
              <Radio.Button value="Extreme">Extreme</Radio.Button>
            </Space>
          </Radio.Group>
        </div>
      </Card>

      {/* Section 2: Teaching */}
      <Card title="Teaching" style={{ marginBottom: 24 }}>
        {[
          { label: 'Lecture clarity', value: lectureClarity, setter: setLectureClarity },
          { label: 'Lab usefulness', value: labUsefulness, setter: setLabUsefulness },
          { label: 'Feedback quality', value: feedbackQuality, setter: setFeedbackQuality },
          { label: 'Organization quality', value: organizationQuality, setter: setOrganizationQuality },
        ].map(({ label, value, setter }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              {label}
            </Text>
            <Radio.Group
              value={value}
              onChange={(e) => setter(e.target.value)}
            >
              <Space>
                {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <Radio.Button key={v} value={v}>
                    {v}
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </div>
        ))}
        <Text type="secondary" style={{ fontSize: 12 }}>
          1 = Very poor, 7 = Excellent
        </Text>
      </Card>

      {/* Section 3: Assessment & grading */}
      <Card title="Assessment & grading" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Assessment types
          </Text>
          <Checkbox.Group
            value={selectedAssessments}
            onChange={(values) => setSelectedAssessments(values as AssessmentType[])}
          >
            <Space direction="vertical">
              {assessmentTypes.map((type) => (
                <Checkbox key={type} value={type}>
                  {type}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Grading strictness
          </Text>
          <Radio.Group
            value={gradingStrictness}
            onChange={(e) => setGradingStrictness(e.target.value)}
          >
            <Space>
              {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                <Radio.Button key={v} value={v}>
                  {v}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            1 = Very lenient, 7 = Very strict
          </Text>
        </div>
      </Card>

      {/* Section 4: Course identity */}
      <Card title="Course identity" style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Tags (select exactly 2)
        </Text>
        <div style={{ marginBottom: 8 }}>
          {allTags.map((tag) => (
            <Checkbox
              key={tag}
              checked={selectedTags.includes(tag)}
              onChange={(e) => handleTagChange(tag, e.target.checked)}
              style={{ marginRight: 16, marginBottom: 8 }}
            >
              {tag}
            </Checkbox>
          ))}
        </div>
        {selectedTags.length > 2 && (
          <Alert message="Please select exactly 2 tags." type="error" />
        )}
      </Card>

      {/* Section 5: Recommendation */}
      <Card title="Recommendation" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Would you take this course again?
          </Text>
          <Radio.Group
            value={wouldTakeAgain}
            onChange={(e) => setWouldTakeAgain(e.target.value)}
          >
            <Radio.Button value={true}>Yes</Radio.Button>
            <Radio.Button value={false}>No</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Recommend for
          </Text>
          <Checkbox.Group
            value={selectedRecommend}
            onChange={(values) => setSelectedRecommend(values as RecommendForOption[])}
          >
            <Space direction="vertical">
              {recommendOptions.map((opt) => (
                <Checkbox key={opt} value={opt}>
                  {opt}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </div>
      </Card>

      {/* Section 6: Optional comments */}
      <Card title="Optional comments" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Top pros (optional)
          </Text>
          <TextArea
            placeholder="What worked well?"
            value={freeTextPros}
            onChange={(e) => setFreeTextPros(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Top cons (optional)
          </Text>
          <TextArea
            placeholder="What could be improved?"
            value={freeTextCons}
            onChange={(e) => setFreeTextCons(e.target.value)}
            rows={3}
          />
        </div>
      </Card>

      {/* Footer actions */}
      <Row justify="space-between" align="middle">
        <Col>
          <Button type="primary" size="large" onClick={handleSubmit}>
            Submit evaluation
          </Button>
        </Col>
        <Col>
          <Button type="link" onClick={() => navigate(`/courses/${courseId}/evaluation`)}>
            View results
          </Button>
        </Col>
      </Row>
    </div>
  );
};
