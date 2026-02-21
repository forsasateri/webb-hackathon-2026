import { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Space, Progress, message, Result, Tag } from 'antd';
import { ThunderboltOutlined, TrophyOutlined, ReloadOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
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
    // loser = isLeft ? rightCourse : leftCourse;

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
        <div className="cyber-loader" style={{ marginBottom: 16 }}>
          <div className="cyber-loader-bar" />
          <div className="cyber-loader-bar" />
          <div className="cyber-loader-bar" />
          <div className="cyber-loader-bar" />
          <div className="cyber-loader-bar" />
        </div>
        <Paragraph style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading courses...</Paragraph>
      </div>
    );
  }

  // ── Init Phase ──
  if (phase === 'init') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', padding: '40px 20px' }}
      >
        <ThunderboltOutlined style={{
          fontSize: 64,
          color: '#ffd700',
          filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))',
        }} />
        <Title level={2} style={{
          marginTop: 16,
          fontFamily: "var(--font-display, 'Orbitron', monospace)",
          letterSpacing: '0.05em',
        }}>
          Course Battle
        </Title>
        <Paragraph style={{ fontSize: 16, maxWidth: 500, margin: '0 auto 24px', color: 'var(--text-secondary)' }}>
          Two courses enter, one survives! Pick your favorite in each round.
          After {TOTAL_ROUNDS} rounds, your champion course will be revealed.
          The system uses course recommendations to find worthy challengers!
        </Paragraph>
        <Button
          className="cta-breathing"
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={startBattle}
          disabled={allCourses.length < 2}
          style={{
            height: 48,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Start Battle!
        </Button>
      </motion.div>
    );
  }

  // ── Result Phase ──
  if (phase === 'result' && winner) {
    // Fire confetti on result
    setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#00f0ff', '#b026ff', '#ffd700', '#ff003c'] });
    }, 200);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', padding: '40px 20px' }}
      >
        <Result
          icon={<TrophyOutlined style={{
            color: '#ffd700',
            fontSize: 64,
            filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.6))',
          }} />}
          title={<span style={{ fontFamily: "var(--font-display)", letterSpacing: '0.05em' }}>Your Champion Course!</span>}
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
            className="cta-breathing"
            style={{ height: 48, borderRadius: 12, fontWeight: 600 }}
          >
            Enroll Now!
          </Button>
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={startBattle}
            style={{ height: 48, borderRadius: 12 }}
          >
            Play Again
          </Button>
        </Space>
      </motion.div>
    );
  }

  // ── Battle Phase ──
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <Title level={2} style={{
        fontFamily: "var(--font-display, 'Orbitron', monospace)",
        letterSpacing: '0.05em',
      }}>
        <ThunderboltOutlined style={{ color: '#ffd700', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.5))' }} /> Course Battle
      </Title>

      <Space style={{ marginBottom: 16 }}>
        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
          Round {round} / {TOTAL_ROUNDS}
        </Tag>
      </Space>

      <Progress
        percent={Math.round((round / TOTAL_ROUNDS) * 100)}
        showInfo={false}
        strokeColor={{
          '0%': '#00f0ff',
          '100%': '#b026ff',
        }}
        style={{ maxWidth: 400, margin: '0 auto 24px' }}
      />

      <Text style={{ display: 'block', marginBottom: 24, fontSize: 16, color: 'var(--text-secondary)' }}>
        Which course do you prefer? Click to choose!
      </Text>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <AnimatePresence mode="wait">
          {leftCourse && (
            <motion.div
              key={`left-${leftCourse.id}`}
              initial={{ opacity: 0, x: -50, rotateY: -15 }}
              animate={{ opacity: animating ? 0.5 : 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -80, scale: 0.8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <BattleCard
                course={leftCourse}
                onSelect={handleSelect}
                disabled={animating}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* VS badge */}
        <div
          className="vs-flash"
          style={{
            fontFamily: "var(--font-display, 'Orbitron', monospace)",
            fontSize: 48,
            fontWeight: 900,
            color: '#ffd700',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          VS
        </div>

        <AnimatePresence mode="wait">
          {rightCourse && (
            <motion.div
              key={`right-${rightCourse.id}`}
              initial={{ opacity: 0, x: 50, rotateY: 15 }}
              animate={{ opacity: animating ? 0.5 : 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: 80, scale: 0.8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <BattleCard
                course={rightCourse}
                onSelect={handleSelect}
                disabled={animating}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {fetchingNext && (
        <div style={{ marginTop: 20 }}>
          <div className="cyber-loader" style={{ display: 'inline-flex', marginRight: 8 }}>
            <div className="cyber-loader-bar" style={{ height: 12 }} />
            <div className="cyber-loader-bar" style={{ height: 12 }} />
            <div className="cyber-loader-bar" style={{ height: 12 }} />
          </div>
          <Text type="secondary">Finding next challenger...</Text>
        </div>
      )}
    </div>
  );
};
