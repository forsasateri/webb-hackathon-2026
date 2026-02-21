import { getColorForCourse } from "../../shared";
import type { Course } from "../../types";
import { Row, Col, Avatar, Tag, Space } from 'antd';

const tierColors: { [key: string]: string } = {
    S: "#ffc53d", // gold
    A: "#95de64", // lightgreen
    B: "#87e8de", // lightblue
    C: "#fffb8f", // yellow
    D: "#ffc069", // orange
    F: "#ff7875", // red
  };

export const TierCategory = ({ tier, courses }: { tier: string; courses: Course[] }) => {
    
    
    return (
        <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '10px' }}>
            <Col>
                <Avatar 
                    shape="square"
                    size={64} 
                    style={{ 
                        backgroundColor: tierColors[tier] || 'grey', 
                        color: 'black',
                        fontSize: '24px',
                        fontWeight: 'bold',
                    }}
                >
                    {tier}
                </Avatar>
            </Col>
            <Col flex="auto">
                <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '2px',
                    padding: '8px',
                    minHeight: '64px'
                }}>
                    <Space size={[0, 8]} wrap>
                        {courses.map((course) => (
                            <Tag key={course.id} color={getColorForCourse(course)} variant="solid" >
                                {course.courseCode}
                            </Tag>
                        ))}
                    </Space>
                </div>
            </Col>
        </Row>
    )
}