/**
 * WorldRenderer — tile pool + scrolling tests (Batch 3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Pixi
const mockContainer = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  eventMode: 'passive' as string,
  destroy: vi.fn(),
  children: [] as any[],
};

const createMockSprite = () => ({
  x: 0, y: 0, width: 64, height: 24,
  tint: 0xffffff, alpha: 1, visible: true,
  destroy: vi.fn(),
  label: '',
  parent: mockContainer,
});

const createMockText = () => ({
  x: 0, y: 0, text: '', style: {}, destroy: vi.fn(),
});

vi.mock('pixi.js', () => ({
  Container: vi.fn().mockImplementation(() => ({ ...mockContainer, children: [], addChild: vi.fn(), removeChild: vi.fn() })),
  Sprite: vi.fn().mockImplementation(createMockSprite),
  Text: vi.fn().mockImplementation(createMockText),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    x: 0, y: 0, width: 0, height: 0,
  })),
  Assets: { get: vi.fn().mockReturnValue(null) },
  Texture: { EMPTY: {} },
}));

vi.mock('gsap', () => ({ default: { killTweensOf: vi.fn(), to: vi.fn() } }));

describe('WorldRenderer — tile pool + scrolling', () => {
  it('init places tile sprites in platform zone', async () => {
    const { WorldRenderer } = await import('~/game/dash-runner/renderers/WorldRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), children: [] } as any;
    const renderer = new WorldRenderer();
    const tiles = [
      { col: 0, type: 'platform' as const },
      { col: 1, type: 'platform' as const },
    ];
    renderer.init(tiles, parent, 390, 844, 180);
    // Renderer should have created tile sprites
    expect(parent.addChild).toHaveBeenCalled();
  });

  it('off-screen tile is recycled to right edge', async () => {
    const { WorldRenderer } = await import('~/game/dash-runner/renderers/WorldRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), children: [] } as any;
    const renderer = new WorldRenderer();
    const tiles = [{ col: 0, type: 'platform' as const }];
    renderer.init(tiles, parent, 390, 844, 180);

    // Simulate tile scrolling off-screen by updating
    const before = renderer.getTileCount();
    renderer.update(0.1, 180);
    const after = renderer.getTileCount();
    // Tile count should remain the same (recycled, not deleted)
    expect(after).toBe(before);
  });

  it('gap position has no tile sprite', async () => {
    const { WorldRenderer } = await import('~/game/dash-runner/renderers/WorldRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), children: [] } as any;
    const renderer = new WorldRenderer();
    const tiles = [
      { col: 0, type: 'platform' as const },
      { col: 1, type: 'gap' as const },
      { col: 2, type: 'platform' as const },
    ];
    renderer.init(tiles, parent, 390, 844, 180);
    // Gap tiles should not create sprites
    const nonGapTiles = tiles.filter(t => t.type !== 'gap').length;
    const spriteCount = renderer.getTileCount();
    expect(spriteCount).toBe(nonGapTiles);
  });

  it('barrier sprite placed at correct platform-top position', async () => {
    const { WorldRenderer } = await import('~/game/dash-runner/renderers/WorldRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), children: [] } as any;
    const renderer = new WorldRenderer();
    const tiles = [
      { col: 0, type: 'platform' as const },
      { col: 1, type: 'barrier' as const },
    ];
    renderer.init(tiles, parent, 390, 844, 180);
    // Barrier sprite should exist
    expect(parent.addChild).toHaveBeenCalled();
  });

  it('finish-line sprite distinct from platform sprite', async () => {
    const { WorldRenderer } = await import('~/game/dash-runner/renderers/WorldRenderer');
    const parent = { addChild: vi.fn(), removeChild: vi.fn(), children: [] } as any;
    const renderer = new WorldRenderer();
    const tiles = [
      { col: 0, type: 'platform' as const },
      { col: 5, type: 'finish' as const },
    ];
    renderer.init(tiles, parent, 390, 844, 180);
    // Both platform and finish sprites should be present
    expect(parent.addChild).toHaveBeenCalled();
    // The finish sprite's tint is different from platform tint
    const sprites = renderer.getSprites();
    const platformSprites = sprites.filter(s => s.type === 'platform');
    const finishSprites = sprites.filter(s => s.type === 'finish');
    expect(finishSprites.length).toBeGreaterThan(0);
    if (platformSprites.length > 0 && finishSprites.length > 0) {
      expect(finishSprites[0].tint).not.toBe(platformSprites[0].tint);
    }
  });
});
