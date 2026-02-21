import { Typography, Card } from 'antd';
import type { Course } from '../../types';
import { timeSlotsToString } from '../../shared';

const { Title, Paragraph } = Typography;


export const SelectedCourse = ({ course }: { course: Course }) => {

    return (
    <Card 
          style={{ 
            marginTop: '40px', 
            maxWidth: '600px', 
            marginLeft: 'auto', 
            marginRight: 'auto' 
          }}
        >
          <Title level={3}>🎉 You got: {course.code} - {course.name}!</Title>
          <Paragraph style={{ fontSize: '16px', marginTop: '16px' }}>
            {course.description}
          </Paragraph>
          <Paragraph style={{ color: '#888' }}>
            <strong>Time Slot:</strong> {timeSlotsToString(course)}
          </Paragraph>
        </Card>
    );
}