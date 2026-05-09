/**
 * scoring — multiplicative formula tests (Batch 4)
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

describe('scoring — multiplicative formula', () => {
  it('level 1, no retries: score = 1000', async () => {
    const { computeLevelScore } = await import('~/game/dash-runner/state/scoring');
    const score = computeLevelScore({ currentLevel: 1, runnerSpeed: 180, retryCount: 0 });
    expect(score).toBe(1000);
  });

  it('level 5, 2 retries, speed 240: score ≈ 4444', async () => {
    const { computeLevelScore } = await import('~/game/dash-runner/state/scoring');
    const score = computeLevelScore({ currentLevel: 5, runnerSpeed: 240, retryCount: 2 });
    // 5*1000*(240/180)*(1/(1+2*0.25)) = 5000*1.333...*0.6667 ≈ 4444
    expect(score).toBeGreaterThan(4000);
    expect(score).toBeLessThan(5000);
  });

  it('skilled player (max speed, no retries) scores 3× beginner (min speed, high retries)', async () => {
    const { computeLevelScore } = await import('~/game/dash-runner/state/scoring');
    // Max speed = 300 (level 9+), no retries
    const skilled = computeLevelScore({ currentLevel: 5, runnerSpeed: 300, retryCount: 0 });
    // Min speed = 180, 4 retries
    const beginner = computeLevelScore({ currentLevel: 5, runnerSpeed: 180, retryCount: 4 });
    // skilled = 5*1000*(300/180)*1.0 = 8333, beginner = 5*1000*1.0*(1/2) = 2500
    // 8333 / 2500 = 3.33 → > 3x
    expect(skilled).toBeGreaterThanOrEqual(beginner * 3);
  });
});
