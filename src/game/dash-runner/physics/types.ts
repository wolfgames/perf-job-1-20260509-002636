/**
 * Physics types for Dash Runner
 */

import type { GamePhase } from '../state/types';

export interface Tile {
  /** World X position of tile (pixels from left) */
  x: number;
  /** World Y position of tile top (pixels from top) */
  y: number;
  width: number;
  height: number;
  type: 'platform' | 'barrier' | 'finish' | 'gap';
}

export interface PhysicsState {
  /** Runner world X (fixed visually at 25%, world scrolls) */
  runnerX: number;
  /** Runner world Y (top of runner sprite) */
  runnerY: number;
  /** Vertical velocity (px/s). Negative = upward. */
  vy: number;
  /** Whether runner is on a platform surface */
  grounded: boolean;
  gamePhase: GamePhase;
  /** Current level tile layout (in world space) */
  tiles: Tile[];
  /** X position of finish line in world space */
  finishLineX: number;
}

/** Runner sprite dimensions */
export const RUNNER_WIDTH = 32;
export const RUNNER_HEIGHT = 48;

/** Physics constants */
export const GRAVITY = 1800;        // px/s²
export const JUMP_IMPULSE = -620;   // px/s (negative = up)
export const KILL_PLANE_OFFSET = 200; // px below viewport bottom
export const VIEWPORT_HEIGHT = 844;
