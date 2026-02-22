import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { Card, Button, Typography, Tag, Space, Alert } from 'antd';
import { useDiceGame } from './useDiceGame';
import { getFaceDistributionForGrade, type DiceRollResult, GRADE_KEYS } from './types';

const { Title, Text } = Typography;

const gradeColors: Record<string, string> = {
  'U': '#ff4d4f',
  '3': '#faad14',
  '4': '#52c41a',
  '5': '#1890ff'
};

interface RollTheDiceProps {
  currentScore?: string;
  courseCode?: string;
}

/** Map numeric score to Swedish grade system (U/3/4/5) */
function mapScoreToGrade(score: string | undefined): { grade: string | undefined; original: string | undefined; mapped: boolean } {
  if (!score) return { grade: undefined, original: score, mapped: false };

  // Already valid grade
  if (['U', '3', '4', '5'].includes(score)) {
    return { grade: score, original: score, mapped: false };
  }

  // Try to parse as number (0-100 scale)
  const numScore = parseFloat(score);
  if (isNaN(numScore)) {
    return { grade: undefined, original: score, mapped: false };
  }

  // Map to Swedish grades
  // 0-49 -> U, 50-69 -> 3, 70-84 -> 4, 85-100 -> 5
  if (numScore < 50) return { grade: 'U', original: score, mapped: true };
  if (numScore < 70) return { grade: '3', original: score, mapped: true };
  if (numScore < 85) return { grade: '4', original: score, mapped: true };
  return { grade: '5', original: score, mapped: true };
}

export function RollTheDice({ currentScore, courseCode }: RollTheDiceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [status, setStatus] = useState<'waiting' | 'rolling' | 'complete'>('waiting');
  const [liveValues, setLiveValues] = useState<string[]>([]);
  const [liveAverage, setLiveAverage] = useState<string>('');
  const panelWidth = 'min(760px, calc(100vw - 32px))';

  // Map score to grade
  const { grade: mappedGrade, original, mapped: wasMapped } = useMemo(() => {
    return mapScoreToGrade(currentScore);
  }, [currentScore]);
  const faceDistribution = useMemo(
    () => (mappedGrade ? getFaceDistributionForGrade(mappedGrade) : null),
    [mappedGrade]
  );

  const handleRollUpdate = useCallback((rollStatus: 'rolling' | 'complete', values: string[], average: string) => {
    setLiveValues(values);
    setLiveAverage(average);
    setStatus(rollStatus === 'rolling' ? 'rolling' : 'complete');
  }, []);

  const handleRollComplete = useCallback((rollResult: DiceRollResult) => {
    setResult(rollResult);
    setStatus('complete');
  }, []);

  const { initialize, launchDice, isRolling, cleanup } = useDiceGame(handleRollUpdate, handleRollComplete);
  const initializedRef = useRef(false);

  // Initialize the game when container is ready - only once
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initializedRef.current) {
      console.log('[RollTheDice] Already initialized, skipping');
      return;
    }

    if (containerRef.current && mappedGrade) {
      console.log('[RollTheDice] First initialization');
      initializedRef.current = true;
      initialize(containerRef.current);
    }

    return () => {
      if (initializedRef.current) {
        console.log('[RollTheDice] Cleanup');
        cleanup();
        initializedRef.current = false;
      }
    };
  }, [mappedGrade, initialize, cleanup]);

  const handleLaunch = () => {
    if (isRolling || !mappedGrade || !faceDistribution) return;
    setResult(null);
    setStatus('rolling');
    launchDice(faceDistribution);
  };

  const showImprovement = result && mappedGrade && (
    (result.grade === '5' && mappedGrade !== '5') ||
    (result.grade === '4' && (mappedGrade === 'U' || mappedGrade === '3')) ||
    (result.grade === '3' && mappedGrade === 'U')
  );

  // Don't render if no valid grade
  if (!mappedGrade) {
    return (
      <Alert
        title="No Valid Grade"
        description={`Course ${courseCode} does not have a valid grade for the dice game.`}
        type="info"
        showIcon
        style={{ marginTop: '24px', width: panelWidth, marginInline: 'auto' }}
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
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.28)'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
          🎲 Roll the Dice to Improve Your Grade
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Current Grade:{' '}
          {wasMapped && original && (
            <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
              {original}
            </span>
          )}
          <Tag color={gradeColors[mappedGrade] || 'default'} style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {mappedGrade}
          </Tag>
        </Text>
      </div>

      {/* Warning if grade was mapped */}
      {wasMapped && original && (
        <Alert
          title="Grade Converted"
          description={`Your original score "${original}" has been converted to Swedish grade "${mappedGrade}" for the dice game.`}
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 3D Game Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '12px',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 26% 14%, rgba(0, 240, 255, 0.18) 0%, rgba(10, 14, 26, 0.9) 42%), linear-gradient(180deg, rgba(17, 24, 39, 0.92) 0%, rgba(7, 11, 20, 0.98) 100%)',
          boxShadow: 'inset 0 2px 14px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(0, 240, 255, 0.14)',
          marginBottom: '16px'
        }}
      />

      {/* Status Display */}
      <div style={{ textAlign: 'center', marginBottom: '16px', minHeight: '60px' }}>
        {status === 'waiting' && (
          <Text type="secondary">Click "Roll Dice" to try your luck!</Text>
        )}

        {status === 'rolling' && (
          <Space direction="vertical" size="small">
            <Text type="warning" style={{ fontSize: '16px', fontWeight: 'bold' }}>
              🎲 Rolling...
            </Text>
            {liveValues.length > 0 && (
              <Space>
                {liveValues.map((value, idx) => (
                  <Tag key={idx} color={gradeColors[value]} style={{ fontSize: '16px', padding: '4px 12px' }}>
                    D{idx + 1}: {value}
                  </Tag>
                ))}
              </Space>
            )}
            {liveAverage && (
              <Text>Current Average: <Tag color={gradeColors[liveAverage]}>{liveAverage}</Tag></Text>
            )}
          </Space>
        )}

        {status === 'complete' && result && (
          <Space direction="vertical" size="small">
            <Space>
              {result.diceValues.map((value, idx) => (
                <Tag key={idx} color={gradeColors[value]} style={{ fontSize: '16px', padding: '4px 12px' }}>
                  D{idx + 1}: {value}
                </Tag>
              ))}
            </Space>
            <div>
              <Text>Final Grade: </Text>
              <Tag
                color={gradeColors[result.grade]}
                style={{ fontSize: '20px', padding: '6px 16px', fontWeight: 'bold' }}
              >
                {result.grade}
              </Tag>
            </div>
          </Space>
        )}
      </div>

      {/* Action Button */}
      <div style={{ textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          onClick={handleLaunch}
          disabled={isRolling}
          style={{
            width: '200px',
            height: '48px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '24px',
            background: isRolling ? '#4b5563' : 'linear-gradient(135deg, #00f0ff 0%, #4361ee 100%)',
            border: 'none',
            boxShadow: isRolling ? 'none' : '0 4px 18px rgba(0, 240, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {isRolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
        </Button>
      </div>

      {/* Face Distribution Info */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(15, 23, 42, 0.66)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 240, 255, 0.16)'
        }}
      >
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
          Dice face distribution (higher numbers favor improvement from grade {mappedGrade}):
        </Text>
        <Space>
          {GRADE_KEYS.map(key => {
            if (!faceDistribution) return null;
            const count = faceDistribution[key as keyof typeof faceDistribution];
            return (
              <Tag key={key} color={gradeColors[key]} style={{ fontSize: '11px' }}>
                {key}: {count}/6
              </Tag>
            );
          })}
        </Space>
      </div>

      {/* Result Messages */}
      {showImprovement && result && (
        <Alert
          title="🎉 Grade Improved!"
          description={`Your grade improved from ${mappedGrade} to ${result.grade}!`}
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}

      {status === 'complete' && result && !showImprovement && result.grade === mappedGrade && (
        <Alert
          title="Same Grade"
          description={`You rolled the same grade: ${result.grade}. Try again?`}
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}

      {status === 'complete' && result && (
        (result.grade === 'U' && mappedGrade !== 'U') ||
        (result.grade === '3' && (mappedGrade === '4' || mappedGrade === '5')) ||
        (result.grade === '4' && mappedGrade === '5')
      ) && (
        <Alert
          title="😅 Grade Didn't Improve"
          description={`Your grade went from ${mappedGrade} to ${result.grade}. Better luck next time!`}
          type="warning"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );
}
