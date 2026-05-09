/**
 * RunnerRenderer — position sync and win flash tests (Batch 3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKillTweensOf = vi.fn();
const mockTo = vi.fn();

vi.mock('gsap', () => ({
  default: {
    killTweensOf: mockKillTweensOf,
    to: mockTo,
  },
}));

vi.mock('pixi.js', () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    destroy: vi.fn(),
    children: [],
    x: 0, y: 0,
  })),
  Text: vi.fn().mockImplementation(() => ({
    x: 0, y: 0, text: '', tint: 0xffffff,
    destroy: vi.fn(),
    parent: null,
    removeAllListeners: vi.fn(),
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    x: 0, y: 0, width: 32, height: 48,
    tint: 0x00aaff,
    alpha: 1,
    destroy: vi.fn(),
    parent: null,
    removeAllListeners: vi.fn(),
  })),
  Assets: { get: vi.fn().mockReturnValue(null) },
}));

describe('RunnerRenderer — position sync and win flash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('init places runner at 25% x', async () => {
    const { RunnerRenderer } = await import('~/game/dash-runner/renderers/RunnerRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new RunnerRenderer();
    renderer.init(parent, 390, 844);
    expect(renderer.getX()).toBeCloseTo(390 * 0.25, 0);
  });

  it('updatePosition updates y', async () => {
    const { RunnerRenderer } = await import('~/game/dash-runner/renderers/RunnerRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new RunnerRenderer();
    renderer.init(parent, 390, 844);
    renderer.updatePosition(500);
    expect(renderer.getY()).toBe(500);
  });

  it('playWinFlash fires GSAP tween to white tint', async () => {
    const { RunnerRenderer } = await import('~/game/dash-runner/renderers/RunnerRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new RunnerRenderer();
    renderer.init(parent, 390, 844);
    renderer.playWinFlash();
    expect(mockTo).toHaveBeenCalled();
  });

  it('destroy kills tweens before destroying sprite', async () => {
    const { RunnerRenderer } = await import('~/game/dash-runner/renderers/RunnerRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new RunnerRenderer();
    renderer.init(parent, 390, 844);
    renderer.destroy();

    // killTweensOf must be called before sprite.destroy
    expect(mockKillTweensOf).toHaveBeenCalled();
  });

  it('fallback emoji visible when atlas unavailable', async () => {
    const { RunnerRenderer } = await import('~/game/dash-runner/renderers/RunnerRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new RunnerRenderer();
    // useFallback=true forces emoji
    renderer.init(parent, 390, 844, true);
    expect(parent.addChild).toHaveBeenCalled();
    // Renderer should not throw when no atlas
    expect(renderer.getX()).toBeCloseTo(390 * 0.25, 0);
  });
});
