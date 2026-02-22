import { useEffect, useState } from 'react';
import { getAllCourses } from '../api';
import { getSchedule, enrollInCourse, dropCourse } from '../api/enrollment';
import confetti from 'canvas-confetti';
import type { Course } from '../types';
import { LoadingSpinner, CourseList } from '../components';
import { useAuth } from '../context/AuthContext';
import { message, Input, Select, Row, Col } from 'antd';

const { Option } = Select;

// Simple debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const AllCoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Filter states
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [period, setPeriod] = useState<number[]>([]);
  const [slot, setSlot] = useState<number[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Debounce keyword
  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const filters = {
          keyword: debouncedKeyword || undefined,
          department: department || undefined,
          credits: credits || undefined,
          period: period.length > 0 ? period : undefined,
          slot: slot.length > 0 ? slot : undefined,
        };
        const data = await getAllCourses(filters);
        setCourses(data);

        // Extract distinct departments
        const deptSet = new Set(data.map(c => c.department));
        setDepartments(Array.from(deptSet).sort());

        if (isAuthenticated) {
          try {
            const scheduleData = await getSchedule();
            const ids = new Set(scheduleData.schedule.map(e => e.course.id));
            setEnrolledIds(ids);
          } catch {
            // Schedule fetch may fail if not authenticated
          }
        }
      } catch (err: any) {
        message.error('Failed to load courses');
      }
      setLoading(false);
    };

    fetchData();
  }, [isAuthenticated, debouncedKeyword, department, credits, period, slot]);

  // Merge enrolled status into courses
  const coursesWithEnrolled = courses.map(c => ({
    ...c,
    enrolled: enrolledIds.has(c.id),
  }));

  const handleEnroll = async (id: number) => {
    if (!isAuthenticated) {
      message.warning('Please login to enroll in courses');
      return;
    }
    try {
      await enrollInCourse(id);
      message.success('Successfully enrolled!');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#00f0ff', '#b026ff', '#ffd700'] });
      setEnrolledIds(prev => new Set(prev).add(id));
    } catch (err: any) {
      if (err.status === 409) {
        const conflicts = err.data?.conflicts || [];
        const conflictMsg = conflicts
          .map((c: any) => `Period ${c.period}, Slot ${c.slot} conflicts with ${c.conflicting_course_name}`)
          .join('; ');
        message.error(`Time conflict: ${conflictMsg || err.message}`);
      } else {
        message.error(err.message || 'Failed to enroll');
      }
    }
  };

  const handleDrop = async (id: number) => {
    try {
      await dropCourse(id);
      message.success('Course dropped');
      setEnrolledIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      message.error(err.message || 'Failed to drop course');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <CourseList
      courses={coursesWithEnrolled}
      onEnroll={handleEnroll}
      onDrop={handleDrop}
      filterComponent={
        <Row gutter={16}>
          <Col span={6}>
            <Input.Search
              placeholder="Search courses..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Department"
              value={department || undefined}
              onChange={(value) => setDepartment(value || '')}
              allowClear
              style={{ width: '100%' }}
            >
              {departments.map(dept => (
                <Option key={dept} value={dept}>{dept}</Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="credit"
              value={credits}
              onChange={(value) => setCredits(value)}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value={6}>6</Option>
              <Option value={8}>8</Option>
              <Option value={12}>12</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              mode="multiple"
              placeholder="Period (1-8)"
              value={period}
              onChange={(value) => setPeriod(value)}
              allowClear
              style={{ width: '100%' }}
            >
              {[1,2,3,4,5,6,7,8].map(p => (
                <Option key={p} value={p}>{p}</Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Select
              mode="multiple"
              placeholder="Slot (1-4)"
              value={slot}
              onChange={(value) => setSlot(value)}
              allowClear
              style={{ width: '100%' }}
            >
              {[1,2,3,4].map(s => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      }
    />
  );
};