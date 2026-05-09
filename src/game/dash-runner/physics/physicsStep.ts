/**
 * physicsStep — pure physics function for Dash Runner
 *
 * Rules:
 * - No Math.random() (guardrail #9 — pure game state)
 * - No Pixi imports
 * - No DOM reads
 * - Returns new PhysicsState — no mutation
 *
 * Gravity: 1800 px/s²
 * Jump impulse: -620 px/s
 * Kill plane: VIEWPORT_HEIGHT + KILL_PLANE_OFFSET = 1044 px
 * Finish line: detected when runnerX >= finishLineX
 */

import type { PhysicsState, Tile } from './types';
import type { GamePhase } from '../state/types';
import type { DashDatabase } from '../state/DashPlugin';
import {
  GRAVITY,
  JUMP_IMPULSE,
  RUNNER_HEIGHT,
  RUNNER_WIDTH,
  KILL_PLANE_OFFSET,
  VIEWPORT_HEIGHT,
} from './types';

const KILL_PLANE_Y = VIEWPORT_HEIGHT + KILL_PLANE_OFFSET;

// ── AABB helpers ─────────────────────────────────────────────────────────────

function intersects(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Core physics step ─────────────────────────────────────────────────────────

/**
 * Advances physics by dt seconds.
 * Returns a new PhysicsState.
 */
export function physicsStep(state: PhysicsState, dt: number): PhysicsState {
  // If won/lost/animating — no physics
  if (state.gamePhase === 'won' || state.gamePhase === 'lost' || state.gamePhase === 'animating') {
    return { ...state };
  }

  // Check finish line immediately (before physics)
  if (state.runnerX >= state.finishLineX) {
    return { ...state, gamePhase: 'won' };
  }

  // Check kill plane
  if (state.runnerY > KILL_PLANE_Y) {
    return { ...state, gamePhase: 'lost' };
  }

  let { runnerY, vy, grounded } = state;

  // If grounded, runner stays on platform — no gravity applied
  if (grounded) {
    // Runner stays put; no position or velocity change
    // Walked-off-edge detection is handled by WorldRenderer scrolling, not physics
    return { ...state, runnerY, vy: 0, grounded: true, gamePhase: 'idle' };
  }

  // Airborne — apply gravity
  vy = vy + GRAVITY * dt;
  runnerY = runnerY + vy * dt;

  // Check landing on platform
  if (!grounded && vy >= 0) {
    for (const tile of state.tiles) {
      if (tile.type === 'barrier' || tile.type === 'gap') continue;
      // Runner bottom = runnerY + RUNNER_HEIGHT
      const runnerBottom = runnerY + RUNNER_HEIGHT;
      const prevBottom = (state.runnerY) + RUNNER_HEIGHT;
      // Crossing tile top from above
      if (
        prevBottom <= tile.y &&
        runnerBottom >= tile.y &&
        state.runnerX + RUNNER_WIDTH > tile.x &&
        state.runnerX < tile.x + tile.width
      ) {
        runnerY = tile.y - RUNNER_HEIGHT;
        vy = 0;
        grounded = true;
        break;
      }
    }
  }

  // Check barrier collision (loss condition)
  for (const tile of state.tiles) {
    if (tile.type !== 'barrier') continue;
    if (intersects(state.runnerX, runnerY, RUNNER_WIDTH, RUNNER_HEIGHT, tile.x, tile.y, tile.width, tile.height)) {
      return { ...state, runnerY, vy, grounded, gamePhase: 'lost' };
    }
  }

  // Check kill plane after movement
  if (runnerY > KILL_PLANE_Y) {
    return { ...state, runnerY, vy, grounded, gamePhase: 'lost' };
  }

  const gamePhase: GamePhase = grounded ? 'idle' : 'airborne';

  return { ...state, runnerY, vy, grounded, gamePhase };
}

// ── Jump application ──────────────────────────────────────────────────────────

/**
 * Applies a jump impulse to the physics state.
 * Only effective when grounded. Returns new state.
 */
export function applyJump(state: PhysicsState): PhysicsState {
  if (!state.grounded || state.gamePhase !== 'idle') {
    // Airborne tap — no change
    return { ...state };
  }
  return {
    ...state,
    vy: JUMP_IMPULSE,
    grounded: false,
    gamePhase: 'airborne',
  };
}

// ── Tap input handler ─────────────────────────────────────────────────────────

/**
 * Handles a player tap event.
 * Routes to jump or wiggle feedback based on gamePhase.
 * No double-jump.
 */
export function handleTap(
  currentPhase: GamePhase,
  db: DashDatabase,
  onAirborneTap: () => void,
): void {
  if (currentPhase === 'idle') {
    db.transactions.jump();
  } else if (currentPhase === 'airborne') {
    // Airborne tap — give visual feedback (wiggle) without jumping
    onAirborneTap();
  }
  // won/lost/animating — tap is silently ignored
}

