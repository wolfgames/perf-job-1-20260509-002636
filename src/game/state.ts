import { createSignal, createRoot } from 'solid-js';

/**
 * Game state that persists across screens.
 * Created in a root to avoid disposal issues.
 *
 * ECS is the source of truth for game state (ecs-state.mdc).
 * These signals are bridge targets only — bridgeEcsToSignals() propagates
 * from ECS resources to these signals.
 * Signals survive ECS destroy/recreate so result screens can read them.
 */

export interface GameState {
  score: () => number;
  setScore: (score: number) => void;
  addScore: (amount: number) => void;

  level: () => number;
  setLevel: (level: number) => void;
  incrementLevel: () => void;

  levelsCleared: () => number;
  setLevelsCleared: (count: number) => void;

  isAllClear: () => boolean;
  setIsAllClear: (v: boolean) => void;

  isLoss: () => boolean;
  setIsLoss: (v: boolean) => void;

  reset: () => void;
}

function createGameState(): GameState {
  const [score, setScore] = createSignal(0);
  const [level, setLevel] = createSignal(1);
  const [levelsCleared, setLevelsCleared] = createSignal(0);
  const [isAllClear, setIsAllClear] = createSignal(false);
  const [isLoss, setIsLoss] = createSignal(false);

  return {
    score,
    setScore,
    addScore: (amount: number) => setScore((s) => s + amount),

    level,
    setLevel,
    incrementLevel: () => setLevel((l) => l + 1),

    levelsCleared,
    setLevelsCleared,

    isAllClear,
    setIsAllClear,

    isLoss,
    setIsLoss,

    reset: () => {
      setScore(0);
      setLevel(1);
      setLevelsCleared(0);
      setIsAllClear(false);
      setIsLoss(false);
    },
  };
}

export const gameState = createRoot(createGameState);
