import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { Card, Button, Typography, Tag, Space, Alert, message } from 'antd';
import { useDiceGame } from './useDiceGame';
import { getFaceDistributionForGrade, type DiceRollResult, GRADE_KEYS } from './types';
import { debugClearDiceRolls, finalizeDiceRoll, startDiceRoll } from '../../api/dice';
import type { DiceHistoryEntry, DiceSummary } from '../../api/enrollment';

const { Title, Text } = Typography;

const gradeTagStyles: Record<string, { text: string; background: string; border: string }> = {
  'U': { text: '#ff8b89', background: 'rgba(77, 26, 29, 0.52)', border: 'rgba(255, 95, 95, 0.42)' },
  '3': { text: '#f2bf64', background: 'rgba(76, 52, 20, 0.5)', border: 'rgba(250, 173, 20, 0.38)' },
  '4': { text: '#90d77a', background: 'rgba(29, 66, 35, 0.5)', border: 'rgba(82, 196, 26, 0.38)' },
  '5': { text: '#7db8ff', background: 'rgba(24, 46, 87, 0.5)', border: 'rgba(24, 144, 255, 0.36)' }
};

const alertBaseStyle = {
  borderRadius: '10px',
  color: 'var(--text-primary)'
};

const alertStyles = {
  info: {
    ...alertBaseStyle,
    background: 'rgba(15, 30, 54, 0.78)',
    border: '1px solid rgba(88, 148, 219, 0.34)'
  },
  success: {
    ...alertBaseStyle,
    background: 'rgba(13, 45, 37, 0.8)',
    border: '1px solid rgba(94, 208, 163, 0.32)'
  },
  warning: {
    ...alertBaseStyle,
    background: 'rgba(65, 46, 22, 0.78)',
    border: '1px solid rgba(255, 191, 94, 0.34)'
  }
};

interface RollTheDiceProps {
  courseId: number;
  courseCode?: string;
  currentScore: number | null;
  diceSummary?: DiceSummary;
  diceHistory?: DiceHistoryEntry[];
  onRollCommitted?: () => Promise<void> | void;
}

function toSwedishGrade(score: number | null | undefined): string | undefined {
  if (score === null || score === undefined) return undefined;
  if (score < 50) return 'U';
  if (score < 70) return '3';
  if (score < 85) return '4';
  return '5';
}

function gradeTag(grade: string) {
  const style = gradeTagStyles[grade] ?? gradeTagStyles['3'];
  return (
    <Tag style={{ color: style.text, background: style.background, borderColor: style.border, fontWeight: 700 }}>
      {grade}
    </Tag>
  );
}

export function RollTheDice({
  courseId,
  courseCode,
  currentScore,
  diceSummary,
  diceHistory,
  onRollCommitted,
}: RollTheDiceProps) {
  type ActiveRollMeta = { roll_id: number };

  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [status, setStatus] = useState<'waiting' | 'rolling' | 'complete'>('waiting');
  const [liveValues, setLiveValues] = useState<string[]>([]);
  const [liveAverage, setLiveAverage] = useState<string>('');
  const [resumeProbe, setResumeProbe] = useState(0);
  const [startingRoll, setStartingRoll] = useState(false);
  const [finalizingRoll, setFinalizingRoll] = useState(false);
  const [debugClearing, setDebugClearing] = useState(false);
  const activeRollRef = useRef<ActiveRollMeta | null>(null);
  const restoredPendingRollIdRef = useRef<number | null>(null);
  const panelWidth = 'min(760px, calc(100vw - 32px))';

  const mappedGrade = useMemo(() => toSwedishGrade(currentScore), [currentScore]);
  const faceDistribution = useMemo(
    () => (mappedGrade ? getFaceDistributionForGrade(mappedGrade) : null),
    [mappedGrade]
  );

  const displayAttemptsUsed = diceSummary?.attempts_used ?? 0;
  const maxAttempts = diceSummary?.max_attempts ?? 3;
  const displayAttemptsLeft = diceSummary?.attempts_left ?? Math.max(0, maxAttempts - displayAttemptsUsed);
  const pendingRoll = useMemo(
    () => [...(diceHistory ?? [])].reverse().find((entry) => entry.status === 'PENDING' && !!entry.launch_plan) ?? null,
    [diceHistory]
  );
  const hasPendingRoll = !!pendingRoll;

  const originalScore = diceSummary?.original_score ?? currentScore;
  const originalGrade = toSwedishGrade(originalScore);
  const currentGrade = mappedGrade;

  const handleRollUpdate = useCallback((rollStatus: 'rolling' | 'complete', values: string[], average: string) => {
    setLiveValues(values);
    setLiveAverage(average);
    setStatus(rollStatus === 'rolling' ? 'rolling' : 'complete');
  }, []);

  const handleRollComplete = useCallback((rollResult: DiceRollResult) => {
    setResult(rollResult);
    setStatus('complete');

    const rollMeta = activeRollRef.current;
    if (!rollMeta) return;

    setFinalizingRoll(true);
    void finalizeDiceRoll({
      roll_id: rollMeta.roll_id,
      client_dice_values: rollResult.diceValues,
      client_total: rollResult.total,
      client_average: rollResult.average,
      client_grade: rollResult.grade,
    })
      .then(async () => {
        if (onRollCommitted) {
          await onRollCommitted();
        }
      })
      .catch((err: any) => {
        message.error(err?.message || 'Failed to finalize roll record');
      })
      .finally(() => {
        activeRollRef.current = null;
        setFinalizingRoll(false);
      });
  }, [onRollCommitted]);

  const { initialize, launchDice, isRolling, cleanup } = useDiceGame(handleRollUpdate, handleRollComplete);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    if (containerRef.current) {
      initializedRef.current = true;
      initialize(containerRef.current);
    }

    return () => {
      if (initializedRef.current) {
        cleanup();
        initializedRef.current = false;
      }
    };
  }, [initialize, cleanup]);

  useEffect(() => {
    if (!pendingRoll || !faceDistribution || isRolling || startingRoll || finalizingRoll) return;
    if (!initializedRef.current) return;
    if (activeRollRef.current?.roll_id === pendingRoll.roll_id) return;
    if (restoredPendingRollIdRef.current === pendingRoll.roll_id && status !== 'waiting') return;

    const launched = launchDice(faceDistribution, pendingRoll.launch_plan ?? undefined);
    if (!launched) {
      const timer = window.setTimeout(() => setResumeProbe((n) => n + 1), 220);
      return () => window.clearTimeout(timer);
    }

    activeRollRef.current = { roll_id: pendingRoll.roll_id };
    restoredPendingRollIdRef.current = pendingRoll.roll_id;
    setResult(null);
    setStatus('rolling');
    message.info('Resuming pending roll with previous random parameters.');
  }, [
    pendingRoll,
    faceDistribution,
    isRolling,
    startingRoll,
    finalizingRoll,
    launchDice,
    resumeProbe,
    status,
  ]);

  const handleLaunch = async () => {
    if (isRolling || !mappedGrade || !faceDistribution || startingRoll || finalizingRoll) return;
    if (displayAttemptsLeft <= 0 && !hasPendingRoll) return;

    setResult(null);
    setStatus('rolling');
    setStartingRoll(true);

    try {
      const start = await startDiceRoll(courseId);
      const launched = launchDice(faceDistribution, start.launch_plan);
      if (!launched) {
        throw new Error('Dice scene is still initializing, please retry in a second.');
      }

      activeRollRef.current = { roll_id: start.roll_id };
      if (start.status === 'PENDING' && pendingRoll?.roll_id === start.roll_id) {
        message.info(start.message || 'Pending roll resumed.');
      } else {
        message.success(start.message || `Roll accepted: ${start.attempts_left} attempt(s) remaining.`);
      }
    } catch (err: any) {
      setStatus('waiting');
      message.error(err?.message || 'Failed to start dice roll');
    } finally {
      setStartingRoll(false);
    }
  };

  const handleDebugClear = async () => {
    if (debugClearing || isRolling || finalizingRoll) return;
    setDebugClearing(true);
    try {
      const res = await debugClearDiceRolls(courseId);
      setResult(null);
      setStatus('waiting');
      setLiveValues([]);
      setLiveAverage('');
      activeRollRef.current = null;
      restoredPendingRollIdRef.current = null;
      message.success(`Debug cleared ${res.deleted_rolls} roll record(s).`);
      if (onRollCommitted) {
        await onRollCommitted();
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to clear dice rolls');
    } finally {
      setDebugClearing(false);
    }
  };

  const showImprovement = result && currentGrade && (
    (result.grade === '5' && currentGrade !== '5') ||
    (result.grade === '4' && (currentGrade === 'U' || currentGrade === '3')) ||
    (result.grade === '3' && currentGrade === 'U')
  );

  if (!mappedGrade) {
    return (
      <Alert
        className="roll-dice-alert"
        title="No Valid Grade"
        description={`Course ${courseCode} does not have a valid score for dice roll.`}
        type="info"
        showIcon
        style={{ ...alertStyles.info, marginTop: '24px', width: panelWidth, marginInline: 'auto' }}
      />
    );
  }

  return (
    <Card
      style={{
        marginTop: '24px',
        width: panelWidth,
        marginInline: 'auto',
        borderRadius: '16px',
        boxShadow: '0 14px 30px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          🎲 Roll the Dice to Improve Your Grade
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Attempts: {displayAttemptsUsed}/{maxAttempts} used, {displayAttemptsLeft} left
        </Text>
      </div>

      {displayAttemptsLeft === 1 && (
        <Alert
          className="roll-dice-alert"
          type="warning"
          showIcon
          title="Last Chance! 🤡"
          description="One throw left. No pressure... just your academic destiny and a very dramatic dice bowl."
          style={{ ...alertStyles.warning, marginBottom: '16px' }}
        />
      )}

      <div style={{ marginBottom: '14px', textAlign: 'center' }}>
        <Space size="middle" wrap>
          <Text style={{ color: '#9fb4d1' }}>
            Original: {originalGrade ? gradeTag(originalGrade) : 'N/A'} ({originalScore ?? 'N/A'})
          </Text>
          <Text style={{ color: '#9fb4d1' }}>
            Current: {currentGrade ? gradeTag(currentGrade) : 'N/A'} ({currentScore ?? 'N/A'})
          </Text>
        </Space>
      </div>

      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '12px', color: '#8ea9cc' }}>
        Rule: starting a roll consumes one attempt immediately; score is committed when the roll result is finalized.
      </Text>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '12px',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 26% 14%, rgba(0, 168, 212, 0.1) 0%, rgba(9, 14, 27, 0.95) 42%), linear-gradient(180deg, rgba(15, 22, 39, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)',
          boxShadow: 'inset 0 2px 14px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(67, 145, 255, 0.13)',
          marginBottom: '16px'
        }}
      />

      <div style={{ textAlign: 'center', marginBottom: '16px', minHeight: '60px' }}>
        {status === 'waiting' && (
          <Text type="secondary" style={{ color: 'var(--text-secondary)' }}>
            {hasPendingRoll ? 'Detected pending roll. It will resume automatically.' : 'Click "Roll Dice" to try your luck.'}
          </Text>
        )}

        {status === 'rolling' && (
          <Space direction="vertical" size="small">
            <Text style={{ fontSize: '16px', fontWeight: 700, color: '#7db8ff' }}>
              🎲 Rolling...
            </Text>
            {liveValues.length > 0 && (
              <Space>
                {liveValues.map((value, idx) => {
                  const style = gradeTagStyles[value] ?? gradeTagStyles['3'];
                  return (
                    <Tag
                      key={idx}
                      style={{
                        fontSize: '16px',
                        padding: '4px 12px',
                        color: style.text,
                        background: style.background,
                        borderColor: style.border
                      }}
                    >
                      D{idx + 1}: {value}
                    </Tag>
                  );
                })}
              </Space>
            )}
            {liveAverage && (
              <Text style={{ color: 'var(--text-primary)' }}>
                Current Average: {gradeTag(liveAverage)}
              </Text>
            )}
          </Space>
        )}

        {status === 'complete' && result && (
          <Space direction="vertical" size="small">
            <Space>
              {result.diceValues.map((value, idx) => {
                const style = gradeTagStyles[value] ?? gradeTagStyles['3'];
                return (
                  <Tag
                    key={idx}
                    style={{
                      fontSize: '16px',
                      padding: '4px 12px',
                      color: style.text,
                      background: style.background,
                      borderColor: style.border
                    }}
                  >
                    D{idx + 1}: {value}
                  </Tag>
                );
              })}
            </Space>
            <div>
              <Text style={{ color: 'var(--text-primary)' }}>Final Grade: </Text>
              {gradeTag(result.grade)}
            </div>
          </Space>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {(() => {
          const launchDisabled =
            isRolling ||
            startingRoll ||
            finalizingRoll ||
            (displayAttemptsLeft <= 0 && !hasPendingRoll);
          const buttonText = finalizingRoll
            ? 'Saving result...'
            : isRolling
              ? '🎲 Rolling...'
              : hasPendingRoll
                ? 'Resume Pending Roll'
                : displayAttemptsLeft <= 0
                  ? 'No Rolls Left'
                  : `🎲 Roll Dice (${displayAttemptsLeft} left)`;
          return (
        <Button
          type="primary"
          size="large"
          onClick={handleLaunch}
          disabled={launchDisabled}
          style={{
            width: '240px',
            height: '48px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '24px',
            background: (isRolling || startingRoll || finalizingRoll)
              ? '#334155'
              : 'linear-gradient(135deg, #1b7ea4 0%, #3459a8 100%)',
            border: 'none',
            boxShadow: (isRolling || startingRoll || finalizingRoll)
              ? 'none'
              : '0 4px 14px rgba(42, 116, 203, 0.28)',
              color: '#e2efff',
              transition: 'all 0.3s ease'
            }}
          >
            {buttonText}
          </Button>
          );
        })()}
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(13, 21, 37, 0.76)',
          borderRadius: '8px',
          border: '1px solid rgba(80, 140, 219, 0.24)'
        }}
      >
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px', color: '#9fb4d1' }}>
          Dice face distribution (higher numbers favor improvement from grade {mappedGrade}):
        </Text>
        <Space>
          {GRADE_KEYS.map((key) => {
            if (!faceDistribution) return null;
            const count = faceDistribution[key as keyof typeof faceDistribution];
            const style = gradeTagStyles[key] ?? gradeTagStyles['3'];
            return (
              <Tag
                key={key}
                style={{
                  fontSize: '11px',
                  color: style.text,
                  background: style.background,
                  borderColor: style.border
                }}
              >
                {key}: {count}/6
              </Tag>
            );
          })}
        </Space>
      </div>

      {!!diceHistory?.length && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(11, 18, 32, 0.76)',
            borderRadius: '8px',
            border: '1px solid rgba(88, 148, 219, 0.24)'
          }}
        >
          <Text style={{ color: '#b6c8df', display: 'block', marginBottom: 8, fontWeight: 600 }}>Roll History</Text>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {[...diceHistory].slice(-3).reverse().map((h) => (
              <Text key={h.roll_id} style={{ color: '#9db5d3' }}>
                Attempt #{h.attempt_number}: {h.grade_before} → {h.grade_after} ({h.score_before} → {h.score_after})
                {h.status === 'PENDING' ? ' [PENDING]' : ''}
              </Text>
            ))}
          </Space>
        </div>
      )}

      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <Button
          size="small"
          type="default"
          danger
          ghost
          onClick={handleDebugClear}
          loading={debugClearing}
          disabled={isRolling || finalizingRoll}
        >
          Debug: Clear Dice Records
        </Button>
      </div>

      {showImprovement && result && (
        <Alert
          className="roll-dice-alert"
          title="🎉 Grade Improved!"
          description={`Your grade improved to ${result.grade}!`}
          type="success"
          showIcon
          style={{ ...alertStyles.success, marginTop: '16px' }}
        />
      )}

      {status === 'complete' && result && !showImprovement && result.grade === currentGrade && (
        <Alert
          className="roll-dice-alert"
          title="Same Grade"
          description={`You rolled the same grade: ${result.grade}.`}
          type="info"
          showIcon
          style={{ ...alertStyles.info, marginTop: '16px' }}
        />
      )}

      {status === 'complete' && result && !showImprovement && result.grade !== currentGrade && (
        <Alert
          className="roll-dice-alert"
          title="😅 Grade Changed"
          description={`New committed grade is ${result.grade}. Better luck next time!`}
          type="warning"
          showIcon
          style={{ ...alertStyles.warning, marginTop: '16px' }}
        />
      )}
    </Card>
  );
}
