/**
 * physicsStep — core physics tests (Batch 2)
 */

import { describe, it, expect } from 'vitest';

describe('physicsStep — core physics', () => {
  it('grounded runner stays on platform', async () => {
    const { physicsStep } = await import('~/game/dash-runner/physics/physicsStep');
    const state = {
      runnerX: 97,
      runnerY: 400,
      vy: 0,
      grounded: true,
      gamePhase: 'idle' as const,
      tiles: [{ x: 0, y: 400, width: 64, height: 24, type: 'platform' as const }],
      finishLineX: 2000,
    };
    const next = physicsStep(state, 1 / 60);
    // grounded runner y does not change
    expect(next.runnerY).toBe(400);
    expect(next.grounded).toBe(true);
    expect(next.vy).toBe(0);
  });

  it('airborne runner accelerates at gravity 1800 px/s²', async () => {
    const { physicsStep } = await import('~/game/dash-runner/physics/physicsStep');
    const dt = 1 / 60;
    const state = {
      runnerX: 97,
      runnerY: 300,
      vy: 0,
      grounded: false,
      gamePhase: 'airborne' as const,
      tiles: [],
      finishLineX: 2000,
    };
    const next = physicsStep(state, dt);
    // vy should increase by gravity * dt = 1800 * (1/60) = 30
    expect(next.vy).toBeCloseTo(30, 1);
    expect(next.grounded).toBe(false);
  });

  it('kill plane triggers phase lost', async () => {
    const { physicsStep } = await import('~/game/dash-runner/physics/physicsStep');
    const state = {
      runnerX: 97,
      // Far below kill plane (platform surface + 200px below viewport 844 + extra)
      runnerY: 1200,
      vy: 500,
      grounded: false,
      gamePhase: 'airborne' as const,
      tiles: [],
      finishLineX: 2000,
    };
    const next = physicsStep(state, 1 / 60);
    expect(next.gamePhase).toBe('lost');
  });

  it('finish line triggers phase won', async () => {
    const { physicsStep } = await import('~/game/dash-runner/physics/physicsStep');
    const state = {
      runnerX: 2000,
      runnerY: 400,
      vy: 0,
      grounded: true,
      gamePhase: 'idle' as const,
      tiles: [{ x: 1900, y: 400, width: 200, height: 24, type: 'platform' as const }],
      finishLineX: 1999,
    };
    const next = physicsStep(state, 1 / 60);
    expect(next.gamePhase).toBe('won');
  });

  it('jump impulse sets vy to -620 on grounded tap', async () => {
    const { applyJump } = await import('~/game/dash-runner/physics/physicsStep');
    const state = {
      runnerX: 97,
      runnerY: 400,
      vy: 0,
      grounded: true,
      gamePhase: 'idle' as const,
      tiles: [],
      finishLineX: 2000,
    };
    const next = applyJump(state);
    expect(next.vy).toBe(-620);
    expect(next.grounded).toBe(false);
    expect(next.gamePhase).toBe('airborne');
  });

  it('airborne tap leaves vy unchanged', async () => {
    const { applyJump } = await import('~/game/dash-runner/physics/physicsStep');
    const state = {
      runnerX: 97,
      runnerY: 300,
      vy: -400,
      grounded: false,
      gamePhase: 'airborne' as const,
      tiles: [],
      finishLineX: 2000,
    };
    const next = applyJump(state);
    // Airborne tap: phase stays airborne, vy unchanged
    expect(next.vy).toBe(-400);
    expect(next.gamePhase).toBe('airborne');
  });
});
