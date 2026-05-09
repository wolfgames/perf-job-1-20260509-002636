/**
 * levelGenerator — procedural level tests (Batch 2)
 */

import { describe, it, expect } from 'vitest';

describe('levelGenerator — procedural level', () => {
  it('level 1 has 5-tile start platform', async () => {
    const { generateLevel } = await import('~/game/dash-runner/level/levelGenerator');
    const layout = generateLevel({ levelNumber: 1, seed: 48271 });
    // First 5 tiles should be platforms (start platform)
    const startTiles = layout.tiles.slice(0, 5);
    expect(startTiles.every(t => t.type === 'platform')).toBe(true);
    expect(startTiles.length).toBeGreaterThanOrEqual(5);
  });

  it('level 1 has no barriers', async () => {
    const { generateLevel } = await import('~/game/dash-runner/level/levelGenerator');
    const layout = generateLevel({ levelNumber: 1, seed: 48271 });
    const barriers = layout.tiles.filter(t => t.type === 'barrier');
    expect(barriers.length).toBe(0);
  });

  it('level 3 has at least one barrier', async () => {
    const { generateLevel } = await import('~/game/dash-runner/level/levelGenerator');
    // Try multiple seeds to ensure barriers appear
    let found = false;
    for (let s = 0; s < 10; s++) {
      const layout = generateLevel({ levelNumber: 3, seed: 144813 + s * 48271 });
      if (layout.tiles.some(t => t.type === 'barrier')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('same seed produces identical layout', async () => {
    const { generateLevel } = await import('~/game/dash-runner/level/levelGenerator');
    const a = generateLevel({ levelNumber: 2, seed: 96542 });
    const b = generateLevel({ levelNumber: 2, seed: 96542 });
    expect(JSON.stringify(a.tiles)).toBe(JSON.stringify(b.tiles));
  });

  it('solvability check passes for level 1', async () => {
    const { generateLevel } = await import('~/game/dash-runner/level/levelGenerator');
    const layout = generateLevel({ levelNumber: 1, seed: 48271 });
    expect(layout.solvable).toBe(true);
  });

  it('level 10 has barrier chance capped at 40%', async () => {
    const { getBarrierChance } = await import('~/game/dash-runner/level/levelGenerator');
    // barrier chance = min(max(0, (levelNumber-2)*0.08), 0.40)
    const chance = getBarrierChance(10);
    expect(chance).toBeLessThanOrEqual(0.40);
  });
});
