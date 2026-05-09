/**
 * level-progression — state transition tests (Batch 5)
 */

import { describe, it, expect, beforeAll } from 'vitest';

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

describe('level-progression — state transitions', () => {
  it('win level 3: currentLevel increments to 4', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setLevel({ level: 3 });
    db.transactions.nextLevel();
    expect(db.store.resources.currentLevel).toBe(4);
  });

  it('speed after level 3 win: 225 px/s', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setLevel({ level: 3 });
    db.transactions.nextLevel();
    // After level 3 win → currentLevel=4, speed = min(180+(4-1)*15,300) = 225
    expect(db.store.resources.runnerSpeed).toBe(225);
  });

  it('speed capped at 300 at level 10', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setLevel({ level: 9 });
    db.transactions.nextLevel();
    // level 10: speed = min(180+(10-1)*15, 300) = min(315, 300) = 300
    expect(db.store.resources.runnerSpeed).toBe(300);
  });

  it('retry: same seed, retryCount incremented', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setLevel({ level: 3 });
    const levelBefore = db.store.resources.currentLevel;
    db.transactions.retry();
    expect(db.store.resources.currentLevel).toBe(levelBefore); // same level
    expect(db.store.resources.retryCount).toBe(1);
    expect(db.store.resources.gamePhase).toBe('idle');
  });

  it('all-clear: levelsCleared=10, allClear=true', async () => {
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setLevel({ level: 10 });
    db.transactions.setAllClear();
    expect(db.store.resources.levelsCleared).toBe(10);
    expect(db.store.resources.isAllClear).toBe(true);
  });
});
