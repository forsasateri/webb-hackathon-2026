import { getColorForCourse } from "../../shared";
import type { Course } from "../../types";
import { Row, Col, Avatar, Space } from 'antd';
import { Link } from "react-router-dom";

const tierColors: { [key: string]: string } = {
    S: "#ffd700", // gold
    A: "#95de64", // lightgreen
    B: "#87e8de", // lightblue
    C: "#fffb8f", // yellow
    D: "#ffc069", // orange
    F: "#ff7875", // red
  };

const tierGlowClass: { [key: string]: string } = {
    S: 'tier-s',
    A: 'tier-a',
    B: 'tier-b',
    C: 'tier-c',
    D: 'tier-d',
    E: 'tier-e',
    F: 'tier-f',
};

export const TierCategory = ({ tier, courses }: { tier: string; courses: Course[] }) => {
    
    
    return (
        <Row align="middle" gutter={[16, 16]} style={{ marginBottom: '10px' }}>
            <Col>
                <Avatar 
                    className={tierGlowClass[tier] || ''}
                    shape="square"
                    size={64} 
                    style={{ 
                        backgroundColor: tierColors[tier] || '#444', 
                        color: tier === 'S' ? '#000' : '#000',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        fontFamily: "var(--font-display, 'Orbitron', monospace)",
                    }}
                >
                    {tier}
                </Avatar>
            </Col>
            <Col flex="auto">
                <div style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px',
                    minHeight: '64px',
                    background: 'rgba(255, 255, 255, 0.03)',
                }}>
                    <Space size={[8, 12]} wrap>
                        {courses.map((course) => (
                            <Link to={`/course/${course.id}`} key={course.id}>
                                <div style={{
                                    background: `linear-gradient(145deg, ${getColorForCourse(course)} 0%, ${getColorForCourse(course)}E0 100%)`,
                                    color: '#000',
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}>
                                    {course.code}
                                </div>
                            </Link>
                        ))}
                    </Space>
                </div>
            </Col>
        </Row>
    )
}