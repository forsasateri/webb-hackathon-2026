import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Row,
  Col,
  Progress,
  Statistic,
  Space,
  Alert,
} from 'antd';
import { getEvaluationCourseById, getEvaluationAggregateByCourseId } from '../mock';

const { Title, Text } = Typography;

export const CourseEvaluationResultsPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = courseId ? getEvaluationCourseById(courseId) : undefined;
  const aggregate = courseId ? getEvaluationAggregateByCourseId(courseId) : undefined;

  if (!course || !aggregate) {
    return (
      <div style={{ maxWidth: 1000, margin: '40px auto', padding: 24 }}>
        <Alert message="Course or evaluation data not found" type="error" />
      </div>
    );
  }

  const renderMeterBar = (value: number, max: number, color: string = '#1890ff') => {
    const percent = (value / max) * 100;
    return (
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: '#f0f0f0',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <Row justify="space-between" align="top" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Evaluation results</Title>
          <Text type="secondary" style={{ fontSize: 16, display: 'block' }}>
            {course.code} — {course.name}
          </Text>
          <Text type="secondary">Responses: {aggregate.n}</Text>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate(`/course/${courseId}`)}>Back to course</Button>
            <Button type="primary" onClick={() => navigate(`/courses/${courseId}/evaluate`)}>
              Submit your evaluation
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Top summary row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Overall" value={`${aggregate.avgOverall5}/5`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Workload" value={`${aggregate.avgWorkload} h/week`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Difficulty" value={`${aggregate.avgDifficulty7}/7`} />
          </Card>
        </Col>
      </Row>

      {/* Section 1: Radar summary (as bar list) */}
      <Card title="Summary" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Difficulty</Text>
            <Text strong>{aggregate.avgDifficulty7}/7</Text>
          </Row>
          {renderMeterBar(aggregate.avgDifficulty7, 7, '#ff4d4f')}
        </div>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Workload</Text>
            <Text strong>{aggregate.avgWorkload} h/week</Text>
          </Row>
          {renderMeterBar(aggregate.avgWorkload, 60, '#faad14')}
        </div>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Stress</Text>
            <Text strong>{aggregate.avgStressScore}/4</Text>
          </Row>
          {renderMeterBar(aggregate.avgStressScore, 4, '#ff7a45')}
        </div>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Teaching support</Text>
            <Text strong>{aggregate.avgTeachingSupport7}/7</Text>
          </Row>
          {renderMeterBar(aggregate.avgTeachingSupport7, 7, '#52c41a')}
        </div>
        <div>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Text>Grading strictness</Text>
            <Text strong>{aggregate.avgGradingStrictness7}/7</Text>
          </Row>
          {renderMeterBar(aggregate.avgGradingStrictness7, 7, '#722ed1')}
        </div>
      </Card>

      {/* Section 2: Assessment breakdown */}
      <Card title="Assessment breakdown" style={{ marginBottom: 24 }}>
        {Object.entries(aggregate.assessmentShare)
          .sort((a, b) => b[1] - a[1])
          .map(([type, percent]) => (
            <div key={type} style={{ marginBottom: 12 }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text>{type}</Text>
                <Text strong>{percent}%</Text>
              </Row>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          ))}
      </Card>

      {/* Section 3: Course identity (tags) */}
      <Card title="Course identity (tags)" style={{ marginBottom: 24 }}>
        {Object.entries(aggregate.tagShare)
          .sort((a, b) => b[1] - a[1])
          .filter(([_, percent]) => percent > 0)
          .map(([tag, percent]) => (
            <div key={tag} style={{ marginBottom: 12 }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text>{tag}</Text>
                <Text strong>{percent}%</Text>
              </Row>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          ))}
      </Card>

      {/* Section 4: Recommendation */}
      <Card title="Recommendation" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 8 }}>
            <Text strong>Would take again</Text>
            <Text strong>{aggregate.wouldTakeAgainShare}%</Text>
          </Row>
          <Progress percent={aggregate.wouldTakeAgainShare} showInfo={false} size="small" />
        </div>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          Recommended for:
        </Text>
        {Object.entries(aggregate.recommendShare)
          .sort((a, b) => b[1] - a[1])
          .map(([option, percent]) => (
            <div key={option} style={{ marginBottom: 12 }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Text>{option}</Text>
                <Text strong>{percent}%</Text>
              </Row>
              <Progress percent={percent} showInfo={false} size="small" />
            </div>
          ))}
      </Card>

      {/* Section 5: Grades */}
      <Card title="Grades" style={{ marginBottom: 24 }}>
        <Row gutter={8}>
          {(['A', 'B', 'C', 'D', 'E', 'U'] as const).map((grade) => (
            <Col key={grade} span={4}>
              <div style={{ textAlign: 'center' }}>
                <Text strong style={{ display: 'block', fontSize: 18, marginBottom: 8 }}>
                  {grade}
                </Text>
                <div
                  style={{
                    height: aggregate.gradeDistribution[grade] * 2,
                    backgroundColor: '#1890ff',
                    borderRadius: '4px 4px 0 0',
                    minHeight: 4,
                  }}
                />
                <Text type="secondary">{aggregate.gradeDistribution[grade]}%</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Section 6: Common feedback */}
      <Row gutter={16}>
        <Col xs={24} md={12} style={{ marginBottom: 16 }}>
          <Card title="Top pros">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {aggregate.topPros.map((pro, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {pro}
                </li>
              ))}
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top cons">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {aggregate.topCons.map((con, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {con}
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
