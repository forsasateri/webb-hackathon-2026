import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShatterPiece {
  id: number;
  x: number;      // starting x offset
  y: number;      // starting y offset
  width: number;
  height: number;
  targetX: number; // final x offset (fly-out)
  targetY: number;
  rotation: number;
  delay: number;
  color: string;
}

interface ShatterEffectProps {
  /** Trigger the shatter – set to true to fire, resets when false */
  active: boolean;
  /** Accent color for the shattered pieces */
  color?: string;
  /** Which side the card is on ('left' | 'right') – pieces fly outward */
  side?: 'left' | 'right';
  /** Callback when shatter animation completes */
  onComplete?: () => void;
}

const PIECE_COUNT = 18;
const DURATION = 0.8;

/** Generate random shatter pieces that fly outward */
function generatePieces(color: string, side: 'left' | 'right'): ShatterPiece[] {
  const pieces: ShatterPiece[] = [];
  // Direction multiplier: pieces fly away from center
  const dirX = side === 'left' ? -1 : 1;

  for (let i = 0; i < PIECE_COUNT; i++) {
    const w = 20 + Math.random() * 50;
    const h = 15 + Math.random() * 40;
    // Start from random position within the card area
    const startX = (Math.random() - 0.5) * 280;
    const startY = (Math.random() - 0.5) * 350;
    // Fly outward with some randomness
    const flyX = dirX * (80 + Math.random() * 300) + (Math.random() - 0.5) * 100;
    const flyY = (Math.random() - 0.5) * 500 + 50; // slightly downward bias
    const rot = (Math.random() - 0.5) * 720;

    // Vary the color slightly for depth
    const opacity = 0.6 + Math.random() * 0.4;
    const hueShift = Math.floor((Math.random() - 0.5) * 30);

    pieces.push({
      id: i,
      x: startX,
      y: startY,
      width: w,
      height: h,
      targetX: startX + flyX,
      targetY: startY + flyY,
      rotation: rot,
      delay: Math.random() * 0.12,
      color: `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, hsl(${hueShift + 200}, 80%, 50%))`,
    });
  }
  return pieces;
}

export const ShatterEffect = ({ active, color = '#ff003c', side = 'left', onComplete }: ShatterEffectProps) => {
  const [pieces, setPieces] = useState<ShatterPiece[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setPieces(generatePieces(color, side));
      setShow(true);
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, (DURATION + 0.2) * 1000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [active, color, side, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: piece.x,
                y: piece.y,
                opacity: 1,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                x: piece.targetX,
                y: piece.targetY,
                opacity: 0,
                rotate: piece.rotation,
                scale: 0.3,
              }}
              transition={{
                duration: DURATION,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: piece.width,
                height: piece.height,
                background: piece.color,
                borderRadius: 2,
                boxShadow: `0 0 8px ${color}88, 0 0 16px ${color}44`,
                clipPath: `polygon(
                  ${Math.round(Math.random() * 20)}% ${Math.round(Math.random() * 20)}%,
                  ${Math.round(70 + Math.random() * 30)}% ${Math.round(Math.random() * 30)}%,
                  ${Math.round(80 + Math.random() * 20)}% ${Math.round(60 + Math.random() * 40)}%,
                  ${Math.round(Math.random() * 40)}% ${Math.round(70 + Math.random() * 30)}%
                )`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Shockwave ring that expands from the impact point
 */
export const ShockwaveEffect = ({ active, color = '#00f0ff' }: { active: boolean; color?: string }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 700);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 3.5, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            boxShadow: `0 0 30px ${color}66, inset 0 0 30px ${color}22`,
            pointerEvents: 'none',
            zIndex: 99,
          }}
        />
      )}
    </AnimatePresence>
  );
};
