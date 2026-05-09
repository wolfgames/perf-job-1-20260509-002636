/**
 * DashPlugin — ECS state shape tests (Batch 1)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSignal } from 'solid-js';

// Polyfill caches API for @adobe/data in test environment
beforeAll(() => {
  if (!globalThis.caches) {
    const store = new Map<string, Map<string, Response>>();
    (globalThis as any).caches = {
      open: async (name: string) => {
        if (!store.has(name)) store.set(name, new Map());
        const cache = store.get(name)!;
        return {
          match: async (key: string) => cache.get(key),
          put: async (key: string, val: Response) => { cache.set(key, val); },
          delete: async (key: string) => cache.delete(key),
          keys: async () => [...cache.keys()],
        };
      },
      has: async (name: string) => store.has(name),
      delete: async (name: string) => store.delete(name),
    };
  }
});

describe('DashPlugin — ECS state shape', () => {
  it('initializes resources with correct defaults', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    expect(db.store.resources.currentLevel).toBe(1);
    expect(db.store.resources.gamePhase).toBe('idle');
    expect(db.store.resources.runnerSpeed).toBe(180);
    expect(db.store.resources.retryCount).toBe(0);
    expect(db.store.resources.levelsCleared).toBe(0);
    expect(db.store.resources.score).toBe(0);
  });

  it('setPhase transaction updates gamePhase', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    db.transactions.setPhase({ phase: 'airborne' });
    expect(db.store.resources.gamePhase).toBe('airborne');

    db.transactions.setPhase({ phase: 'won' });
    expect(db.store.resources.gamePhase).toBe('won');
  });

  it('setLevel transaction updates currentLevel and runnerSpeed', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    db.transactions.setLevel({ level: 3 });
    expect(db.store.resources.currentLevel).toBe(3);
    // speed = min(180 + (3-1)*15, 300) = 210
    expect(db.store.resources.runnerSpeed).toBe(210);
  });

  it('bridgeEcsToSignals wires level signal correctly', async () => {
    const { dashPlugin, bridgeEcsToSignals } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    const [level, setLevel] = createSignal(1);
    const [score, setScore] = createSignal(0);
    const [levelsCleared, setLevelsCleared] = createSignal(0);
    const [isAllClear, setIsAllClear] = createSignal(false);
    const [isLoss, setIsLoss] = createSignal(false);
    const gameState = {
      level,
      setLevel,
      score,
      setScore,
      levelsCleared,
      setLevelsCleared,
      isAllClear,
      setIsAllClear,
      isLoss,
      setIsLoss,
      addScore: (n: number) => setScore(s => s + n),
      incrementLevel: () => setLevel(l => l + 1),
      reset: () => { setLevel(1); setScore(0); setLevelsCleared(0); setIsAllClear(false); setIsLoss(false); },
    };

    const cleanup = bridgeEcsToSignals(db, gameState as any);

    db.transactions.setLevel({ level: 3 });
    expect(level()).toBe(3);

    cleanup();
  });
});
