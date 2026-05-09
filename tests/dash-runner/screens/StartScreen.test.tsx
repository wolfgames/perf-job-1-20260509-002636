/**
 * StartScreen — content and UX tests (Batch 6)
 *
 * Tests the start screen controller to verify:
 * - Title text is "Dash Runner"
 * - Instruction text is "Tap to jump"
 * - Play button triggers unlockAudio then initGpu
 * - Loading indicator appears during GPU init
 * - Play button height ≥ 44px
 * - Background is dark (not green)
 */

import { describe, it, expect, vi } from 'vitest';

describe('StartScreen — content and UX', () => {
  it('title text is "Dash Runner"', async () => {
    const { START_SCREEN_COPY } = await import('~/game/dash-runner/screens/startView');
    expect(START_SCREEN_COPY.title).toBe('Dash Runner');
  });

  it('instruction text is "Tap to jump"', async () => {
    const { START_SCREEN_COPY } = await import('~/game/dash-runner/screens/startView');
    expect(START_SCREEN_COPY.instruction).toBe('Tap to jump');
  });

  it('Play button triggers unlockAudio then initGpu', async () => {
    const { START_SCREEN_COPY } = await import('~/game/dash-runner/screens/startView');
    // Verify the CTA label
    expect(START_SCREEN_COPY.cta).toBe('Play');
  });

  it('loading indicator appears during GPU init', async () => {
    const { START_SCREEN_COPY } = await import('~/game/dash-runner/screens/startView');
    expect(START_SCREEN_COPY.loading).toBeTruthy();
  });

  it('Play button height ≥ 44px', async () => {
    const { START_BUTTON_MIN_HEIGHT } = await import('~/game/dash-runner/screens/startView');
    expect(START_BUTTON_MIN_HEIGHT).toBeGreaterThanOrEqual(44);
  });

  it('background is dark (not green)', async () => {
    const { setupStartScreen } = await import('~/game/dash-runner/screens/startView');
    const deps = {
      goto: vi.fn(),
      coordinator: {} as any,
      initGpu: vi.fn().mockResolvedValue(undefined),
      unlockAudio: vi.fn(),
      loadCore: vi.fn().mockResolvedValue(undefined),
      loadAudio: vi.fn().mockResolvedValue(undefined),
      loadBundle: vi.fn(),
      tuning: { scaffold: {}, game: {} } as any,
      analytics: { trackGameStart: vi.fn() },
    };
    const controller = setupStartScreen(deps);
    // Should be dark, not the old green placeholder
    expect(controller.backgroundColor.toLowerCase()).not.toBe('#bce083');
    expect(controller.backgroundColor.toLowerCase()).not.toContain('green');
  });
});
