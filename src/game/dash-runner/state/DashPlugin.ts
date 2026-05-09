/**
 * DashPlugin — ECS plugin for Dash Runner
 *
 * Plugin property order (enforced): extends → services → components
 * → resources → archetypes → computed → transactions → actions → systems
 *
 * Resources are the source of truth. SolidJS signals (game/state.ts)
 * are bridge targets only — bridgeEcsToSignals() connects them.
 */

import { Database } from '@adobe/data/ecs';
import type { GameState } from '~/game/state';
import type { GamePhase } from './types';
import { computeLevelScore } from './scoring';

// ── Plugin definition ─────────────────────────────────────────────────────

export const dashPlugin = Database.Plugin.create({
  resources: {
    currentLevel: { default: 1 as number },
    gamePhase: { default: 'idle' as GamePhase },
    runnerSpeed: { default: 180 as number },
    retryCount: { default: 0 as number },
    levelsCleared: { default: 0 as number },
    score: { default: 0 as number },
    isAllClear: { default: false as boolean },
    isLoss: { default: false as boolean },
  },
  transactions: {
    setPhase(store, args: { phase: GamePhase }) {
      store.resources.gamePhase = args.phase;
    },
    setLevel(store, args: { level: number }) {
      store.resources.currentLevel = args.level;
      store.resources.runnerSpeed = Math.min(180 + (args.level - 1) * 15, 300);
    },
    incrementLevel(store) {
      const next = store.resources.currentLevel + 1;
      store.resources.currentLevel = next;
      store.resources.runnerSpeed = Math.min(180 + (next - 1) * 15, 300);
      store.resources.retryCount = 0;
    },
    addScore(store, args: { amount: number }) {
      store.resources.score = store.resources.score + args.amount;
    },
    incrementRetry(store) {
      store.resources.retryCount = store.resources.retryCount + 1;
    },
    reset(store) {
      store.resources.currentLevel = 1;
      store.resources.gamePhase = 'idle';
      store.resources.runnerSpeed = 180;
      store.resources.retryCount = 0;
      store.resources.levelsCleared = 0;
      store.resources.score = 0;
      store.resources.isAllClear = false;
      store.resources.isLoss = false;
    },
    setAllClear(store) {
      store.resources.levelsCleared = store.resources.currentLevel;
      store.resources.isAllClear = true;
    },
    setLoss(store) {
      store.resources.isLoss = true;
    },
    finalizeScore(store) {
      const { currentLevel, runnerSpeed, retryCount } = store.resources;
      const levelScore = computeLevelScore({ currentLevel, runnerSpeed, retryCount });
      store.resources.score = store.resources.score + levelScore;
      store.resources.levelsCleared = store.resources.currentLevel;
    },
    nextLevel(store) {
      const next = store.resources.currentLevel + 1;
      store.resources.currentLevel = next;
      store.resources.runnerSpeed = Math.min(180 + (next - 1) * 15, 300);
      store.resources.retryCount = 0;
      store.resources.isLoss = false;
    },
    retry(store) {
      store.resources.retryCount = store.resources.retryCount + 1;
      store.resources.gamePhase = 'idle';
      store.resources.isLoss = false;
    },
    jump(store) {
      store.resources.gamePhase = 'airborne';
    },
  },
});

export type DashDatabase = Database.FromPlugin<typeof dashPlugin>;

// ── ECS → Signal bridge ───────────────────────────────────────────────────

/**
 * Bridges ECS resources to SolidJS signals in gameState.
 * Call after Database.create() and after app is initialized.
 * Returns a cleanup function to stop observing.
 */
export function bridgeEcsToSignals(db: DashDatabase, gameState: GameState): () => void {
  // Track previous values to only update when changed
  let previousLevel = db.store.resources.currentLevel;
  let previousScore = db.store.resources.score;

  // Immediately sync current values (including boolean flags — clears stale state from prior session)
  gameState.setLevel(db.store.resources.currentLevel);
  gameState.setScore(db.store.resources.score);
  gameState.setIsLoss(db.store.resources.isLoss);
  gameState.setIsAllClear(db.store.resources.isAllClear);
  gameState.setLevelsCleared(db.store.resources.levelsCleared);

  function syncSignals() {
    const level = db.store.resources.currentLevel;
    const score = db.store.resources.score;
    if (level !== previousLevel) {
      previousLevel = level;
      gameState.setLevel(level);
    }
    if (score !== previousScore) {
      previousScore = score;
      gameState.setScore(score);
    }
  }

  // Wrap transactions to propagate changes to signals
  const origSetLevel = db.transactions.setLevel;
  const origAddScore = db.transactions.addScore;
  const origIncrementLevel = db.transactions.incrementLevel;
  const origReset = db.transactions.reset;
  const origFinalizeScore = db.transactions.finalizeScore;
  const origNextLevel = db.transactions.nextLevel;
  const origRetry = db.transactions.retry;
  const origSetLoss = db.transactions.setLoss;
  const origSetAllClear = db.transactions.setAllClear;

  db.transactions.setLevel = (args: { level: number }) => {
    origSetLevel(args);
    syncSignals();
  };
  db.transactions.addScore = (args: { amount: number }) => {
    origAddScore(args);
    syncSignals();
  };
  db.transactions.incrementLevel = () => {
    origIncrementLevel();
    syncSignals();
  };
  db.transactions.reset = () => {
    origReset();
    gameState.setLevel(1);
    gameState.setScore(0);
    gameState.setLevelsCleared(0);
    gameState.setIsAllClear(false);
    gameState.setIsLoss(false);
    previousLevel = 1;
    previousScore = 0;
  };
  db.transactions.finalizeScore = () => {
    origFinalizeScore();
    syncSignals();
    // levelsCleared is updated by finalizeScore — bridge to signal
    gameState.setLevelsCleared(db.store.resources.levelsCleared);
  };
  db.transactions.nextLevel = () => {
    origNextLevel();
    syncSignals();
    gameState.setIsLoss(false);
  };
  db.transactions.retry = () => {
    origRetry();
    syncSignals();
  };
  db.transactions.setLoss = () => {
    origSetLoss();
    gameState.setIsLoss(true);
  };
  db.transactions.setAllClear = () => {
    origSetAllClear();
    gameState.setLevelsCleared(db.store.resources.levelsCleared);
    gameState.setIsAllClear(true);
  };

  return function cleanup() {
    db.transactions.setLevel = origSetLevel;
    db.transactions.addScore = origAddScore;
    db.transactions.incrementLevel = origIncrementLevel;
    db.transactions.reset = origReset;
    db.transactions.finalizeScore = origFinalizeScore;
    db.transactions.nextLevel = origNextLevel;
    db.transactions.retry = origRetry;
    db.transactions.setLoss = origSetLoss;
    db.transactions.setAllClear = origSetAllClear;
  };
}
