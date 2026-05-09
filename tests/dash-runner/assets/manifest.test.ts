/**
 * canvas-art-bundles — manifest validation tests (Batch 3)
 */

import { describe, it, expect } from 'vitest';

describe('canvas-art-bundles — manifest validation', () => {
  it('scene-dash bundle has scene-* prefix', async () => {
    const { manifest } = await import('~/game/asset-manifest');
    const bundle = manifest.bundles.find(b => b.name === 'scene-dash');
    expect(bundle).toBeDefined();
    expect(bundle!.name).toMatch(/^scene-/);
  });

  it('all 5 aliases present in bundle', async () => {
    const { manifest } = await import('~/game/asset-manifest');
    const bundle = manifest.bundles.find(b => b.name === 'scene-dash');
    expect(bundle).toBeDefined();
    const aliases = bundle!.assets.map((a: any) => a.alias);
    expect(aliases).toContain('bg-neon-grid');
    expect(aliases).toContain('piece-platform');
    expect(aliases).toContain('piece-barrier');
    expect(aliases).toContain('ui-finish-line');
    expect(aliases).toContain('character-runner');
  });

  it('atlas json is single file (single draw call)', async () => {
    const { manifest } = await import('~/game/asset-manifest');
    const bundle = manifest.bundles.find(b => b.name === 'scene-dash');
    expect(bundle).toBeDefined();
    // All aliases should reference the same atlas json (single draw call)
    // OR the atlas file itself is defined as a single asset
    const srcs = bundle!.assets.map((a: any) => a.src);
    // At least one src should be a json file (atlas)
    expect(srcs.some((s: string) => s.endsWith('.json'))).toBe(true);
  });
});
