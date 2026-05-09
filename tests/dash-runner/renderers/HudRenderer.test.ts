/**
 * HudRenderer — layout and progress tests (Batch 4)
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('gsap', () => ({ default: { killTweensOf: vi.fn(), to: vi.fn() } }));

vi.mock('pixi.js', () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [],
  })),
  Text: vi.fn().mockImplementation(() => ({
    x: 0, y: 0, text: '', style: { fontSize: 18 }, destroy: vi.fn(),
    removeAllListeners: vi.fn(), parent: null,
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    x: 0, y: 0, width: 0, height: 12,
    destroy: vi.fn(),
    clear: vi.fn().mockReturnThis(),
  })),
}));

describe('HudRenderer — layout and progress', () => {
  it('level text is within top 48px', async () => {
    const { HudRenderer } = await import('~/game/dash-runner/renderers/HudRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new HudRenderer();
    renderer.init(parent, 390, 844);
    const pos = renderer.getLevelTextPosition();
    expect(pos.y).toBeLessThan(48);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  it('progress bar width scales with runner position', async () => {
    const { HudRenderer } = await import('~/game/dash-runner/renderers/HudRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new HudRenderer();
    renderer.init(parent, 390, 844);

    // runner at 50% of finish line
    renderer.updateProgress(1000, 2000, 390);
    const w1 = renderer.getProgressWidth();

    // runner at 75% of finish line
    renderer.updateProgress(1500, 2000, 390);
    const w2 = renderer.getProgressWidth();

    expect(w2).toBeGreaterThan(w1);
  });

  it('HUD does not extend below reserved_top = 48px (no overlap with game area)', async () => {
    const { HudRenderer } = await import('~/game/dash-runner/renderers/HudRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new HudRenderer();
    renderer.init(parent, 390, 844);
    const bounds = renderer.getHudBounds();
    expect(bounds.bottom).toBeLessThanOrEqual(48);
  });

  it('level text font size ≥ 16px', async () => {
    const { HudRenderer } = await import('~/game/dash-runner/renderers/HudRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(), children: [] } as any;
    const renderer = new HudRenderer();
    renderer.init(parent, 390, 844);
    expect(renderer.getLevelTextFontSize()).toBeGreaterThanOrEqual(16);
  });
});
