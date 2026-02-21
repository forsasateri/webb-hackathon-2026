import { Button, Typography, Card } from 'antd';
import type { Course } from '../../types';

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
          <Title level={3}>🎉 You got: {course.courseCode} - {course.name}!</Title>
          <Paragraph style={{ fontSize: '16px', marginTop: '16px' }}>
            {course.description}
          </Paragraph>
          <Paragraph style={{ color: '#888' }}>
            <strong>Time Slot:</strong> {course.time_slot}
          </Paragraph>
        </Card>
    );
}