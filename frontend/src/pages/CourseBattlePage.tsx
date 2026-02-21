import { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Space, Progress, message, Modal, Result, Tag, Spin } from 'antd';
import { ThunderboltOutlined, TrophyOutlined, ReloadOutlined } from '@ant-design/icons';
import { BattleCard } from '../components/CourseBattle/BattleCard';
import { getAllCourses } from '../api/courses';
import { getCourseRecommendations } from '../api/recommendations';
import { enrollInCourse } from '../api/enrollment';
import { useAuth } from '../context/AuthContext';
import type { Course } from '../types';

const { Title, Text, Paragraph } = Typography;

const TOTAL_ROUNDS = 7;

type BattlePhase = 'init' | 'battle' | 'result';

export const CourseBattlePage = () => {
  const { isAuthenticated } = useAuth();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('init');
  const [leftCourse, setLeftCourse] = useState<Course | null>(null);
  const [rightCourse, setRightCourse] = useState<Course | null>(null);
  const [round, setRound] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [winner, setWinner] = useState<Course | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Load all courses on mount
  useEffect(() => {
    const load = async () => {
      try {
        const courses = await getAllCourses();
        setAllCourses(courses);
      } catch {
        message.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Pick a random course not yet seen
  const pickRandomUnseen = useCallback((exclude: Set<number>): Course | null => {
    const available = allCourses.filter(c => !exclude.has(c.id));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }, [allCourses]);

  // Start a new battle
  const startBattle = () => {
    const newSeen = new Set<number>();

    const first = pickRandomUnseen(newSeen);
    if (!first) return;
    newSeen.add(first.id);

    const second = pickRandomUnseen(newSeen);
    if (!second) return;
    newSeen.add(second.id);

    setSeenIds(newSeen);
    setLeftCourse(first);
    setRightCourse(second);
    setRound(1);
    setPhase('battle');
    setWinner(null);
  };

  // Handle user selection
  const handleSelect = async (selected: Course) => {
    if (animating || fetchingNext) return;

    const isLeft = selected.id === leftCourse?.id;
    const loser = isLeft ? rightCourse : leftCourse;

    // Last round → we have our winner
    if (round >= TOTAL_ROUNDS) {
      setAnimating(true);
      setTimeout(() => {
        setWinner(selected);
        setPhase('result');
        setAnimating(false);
      }, 400);
      return;
    }

    // Find next challenger via recommendations or random fallback
    setAnimating(true);
    setFetchingNext(true);

    let nextChallenger: Course | null = null;

    try {
      const recData = await getCourseRecommendations(selected.id);
      const recommendations = recData.recommendations || [];
      // Pick the first recommended course that hasn't been seen yet
      for (const rec of recommendations) {
        if (!seenIds.has(rec.id)) {
          // Fetch full course data for the recommended course
          const fullCourse = allCourses.find(c => c.id === rec.id);
          if (fullCourse) {
            nextChallenger = fullCourse;
            break;
          }
        }
      }
    } catch {
      // Recommendation API failed, fall back to random
    }

    // Fallback: random unseen course
    if (!nextChallenger) {
      nextChallenger = pickRandomUnseen(seenIds);
    }

    if (!nextChallenger) {
      // No more courses available → winner is current selection
      setWinner(selected);
      setPhase('result');
      setAnimating(false);
      setFetchingNext(false);
      return;
    }

    // Update seen set
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(nextChallenger!.id);
      return next;
    });

    // Animate card swap
    setTimeout(() => {
      if (isLeft) {
        // Selected left, replace right
        setRightCourse(nextChallenger);
      } else {
        // Selected right, replace left
        setLeftCourse(nextChallenger);
      }
      setRound(prev => prev + 1);
      setAnimating(false);
      setFetchingNext(false);
    }, 400);
  };

  // Enroll in the winner course
  const handleEnroll = async () => {
    if (!winner) return;
    if (!isAuthenticated) {
      message.warning('Please login to enroll in courses');
      return;
    }

    setEnrolling(true);
    try {
      await enrollInCourse(winner.id);
      message.success(`Successfully enrolled in ${winner.code}!`);
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
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>Loading courses...</Paragraph>
      </div>
    );
  }

  // ── Init Phase ──
  if (phase === 'init') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <ThunderboltOutlined style={{ fontSize: 64, color: '#faad14' }} />
        <Title level={2} style={{ marginTop: 16 }}>Course Battle</Title>
        <Paragraph style={{ fontSize: 16, maxWidth: 500, margin: '0 auto 24px' }}>
          Two courses enter, one survives! Pick your favorite in each round.
          After {TOTAL_ROUNDS} rounds, your champion course will be revealed.
          The system uses course recommendations to find worthy challengers!
        </Paragraph>
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={startBattle}
          disabled={allCourses.length < 2}
        >
          Start Battle!
        </Button>
      </div>
    );
  }

  // ── Result Phase ──
  if (phase === 'result' && winner) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Result
          icon={<TrophyOutlined style={{ color: '#faad14', fontSize: 64 }} />}
          title="Your Champion Course!"
          subTitle={`After ${round} rounds of battle, your favorite course is:`}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <BattleCard course={winner} onSelect={() => {}} isWinner disabled />
        </div>
        <Space size="large">
          <Button
            type="primary"
            size="large"
            onClick={handleEnroll}
            loading={enrolling}
          >
            Enroll Now!
          </Button>
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={startBattle}
          >
            Play Again
          </Button>
        </Space>
      </div>
    );
  }

  // ── Battle Phase ──
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <Title level={2}>
        <ThunderboltOutlined /> Course Battle
      </Title>

      <Space style={{ marginBottom: 16 }}>
        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
          Round {round} / {TOTAL_ROUNDS}
        </Tag>
      </Space>

      <Progress
        percent={Math.round((round / TOTAL_ROUNDS) * 100)}
        showInfo={false}
        strokeColor="#faad14"
        style={{ maxWidth: 400, margin: '0 auto 24px' }}
      />

      <Text style={{ display: 'block', marginBottom: 24, fontSize: 16 }}>
        Which course do you prefer? Click to choose!
      </Text>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: 40,
          flexWrap: 'wrap',
          opacity: animating ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {leftCourse && (
          <BattleCard
            course={leftCourse}
            onSelect={handleSelect}
            disabled={animating}
          />
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 32,
          fontWeight: 'bold',
          color: '#faad14',
        }}>
          VS
        </div>

        {rightCourse && (
          <BattleCard
            course={rightCourse}
            onSelect={handleSelect}
            disabled={animating}
          />
        )}
      </div>

      {fetchingNext && (
        <div style={{ marginTop: 20 }}>
          <Spin size="small" /> <Text type="secondary">Finding next challenger...</Text>
        </div>
      )}
    </div>
  );
};
