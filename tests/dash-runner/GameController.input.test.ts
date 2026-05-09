/**
 * tapInputHandler — input gating tests (Batch 2)
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

describe('tapInputHandler — input gating', () => {
  it('idle phase: tap fires jump transaction', async () => {
    const { Database } = await import('@adobe/data/ecs');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { handleTap } = await import('~/game/dash-runner/physics/physicsStep');

    const db = Database.create(dashPlugin);
    db.transactions.setPhase({ phase: 'idle' });

    const mockWiggle = vi.fn();
    handleTap(db.store.resources.gamePhase, db, mockWiggle);

    expect(db.store.resources.gamePhase).toBe('airborne');
    expect(mockWiggle).not.toHaveBeenCalled();
  });

  it('airborne phase: tap does not fire jump, wiggle fires', async () => {
    const { Database } = await import('@adobe/data/ecs');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { handleTap } = await import('~/game/dash-runner/physics/physicsStep');

    const db = Database.create(dashPlugin);
    db.transactions.setPhase({ phase: 'airborne' });

    const mockWiggle = vi.fn();
    handleTap(db.store.resources.gamePhase, db, mockWiggle);

    // phase stays airborne (no jump)
    expect(db.store.resources.gamePhase).toBe('airborne');
    // wiggle fires to give visual feedback
    expect(mockWiggle).toHaveBeenCalled();
  });

  it('won phase: tap is ignored', async () => {
    const { Database } = await import('@adobe/data/ecs');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { handleTap } = await import('~/game/dash-runner/physics/physicsStep');

    const db = Database.create(dashPlugin);
    db.transactions.setPhase({ phase: 'won' });

    const mockWiggle = vi.fn();
    handleTap(db.store.resources.gamePhase, db, mockWiggle);

    expect(db.store.resources.gamePhase).toBe('won');
    expect(mockWiggle).not.toHaveBeenCalled();
  });

  it('animating phase: tap is ignored', async () => {
    const { Database } = await import('@adobe/data/ecs');
    const { dashPlugin } = await import('~/game/dash-runner/state/DashPlugin');
    const { handleTap } = await import('~/game/dash-runner/physics/physicsStep');

    const db = Database.create(dashPlugin);
    db.transactions.setPhase({ phase: 'animating' });

    const mockWiggle = vi.fn();
    handleTap(db.store.resources.gamePhase, db, mockWiggle);

    expect(db.store.resources.gamePhase).toBe('animating');
    expect(mockWiggle).not.toHaveBeenCalled();
  });
});
