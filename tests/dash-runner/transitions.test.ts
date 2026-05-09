/**
 * win-loss transitions — sequence and input blocking tests (Batch 4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill caches for @adobe/data
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

const mockKillTweensOf = vi.fn();
const mockDelayedCall = vi.fn((delay: number, fn: () => void) => { fn(); });
const mockTo = vi.fn();

vi.mock('gsap', () => ({
  default: {
    killTweensOf: mockKillTweensOf,
    delayedCall: mockDelayedCall,
    to: mockTo,
  },
}));

vi.mock('pixi.js', () => ({
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    x: 0, y: 0, width: 390, height: 844, alpha: 0,
    destroy: vi.fn(), removeAllListeners: vi.fn(),
  })),
}));

describe('win-loss transitions — sequence and input blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-mock delayedCall to immediately call the callback
    mockDelayedCall.mockImplementation((_delay: number, fn: () => void) => { fn(); });
    mockTo.mockImplementation((_target: any, vars: any) => {
      if (vars.onComplete) vars.onComplete();
    });
  });

  it('won: flash fires, overlay fades, goto results called', async () => {
    const { createTransitionManager } = await import('~/game/dash-runner/transitions');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    const mockGoto = vi.fn();
    const mockRunnerFlash = vi.fn();
    const manager = createTransitionManager({ db, goto: mockGoto });

    db.transactions.setPhase({ phase: 'won' });
    manager.handleWin(mockRunnerFlash);

    expect(db.store.resources.gamePhase).toBe('animating');
    expect(mockRunnerFlash).toHaveBeenCalled();
    expect(mockGoto).toHaveBeenCalledWith('results');
  });

  it('lost: 200ms fall delay, overlay fades, goto results called', async () => {
    const { createTransitionManager } = await import('~/game/dash-runner/transitions');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    const mockGoto = vi.fn();
    const manager = createTransitionManager({ db, goto: mockGoto });

    db.transactions.setPhase({ phase: 'lost' });
    manager.handleLoss();

    expect(db.store.resources.gamePhase).toBe('animating');
    expect(mockDelayedCall).toHaveBeenCalled();
    expect(mockGoto).toHaveBeenCalledWith('results');
  });

  it('tap during animating phase: ignored', async () => {
    const { handleTap } = await import('~/game/dash-runner/physics/physicsStep');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);
    db.transactions.setPhase({ phase: 'animating' });

    const mockWiggle = vi.fn();
    handleTap(db.store.resources.gamePhase, db, mockWiggle);

    expect(db.store.resources.gamePhase).toBe('animating');
    expect(mockWiggle).not.toHaveBeenCalled();
  });

  it('destroy during transition: no tween fires on destroyed sprite', async () => {
    const { createTransitionManager } = await import('~/game/dash-runner/transitions');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { Database } = await import('@adobe/data/ecs');
    const db = Database.create(dashPlugin);

    const mockGoto = vi.fn();
    const manager = createTransitionManager({ db, goto: mockGoto });

    // Destroy before transition fires
    manager.destroy();

    // killTweensOf should have been called
    expect(mockKillTweensOf).toHaveBeenCalled();
  });
});
