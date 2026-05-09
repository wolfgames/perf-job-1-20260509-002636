/**
 * Procedural Level Generator for Dash Runner
 *
 * Rules (enforced by ECS purity guardrails):
 * - NO Math.random() — uses seeded mulberry32 RNG only
 * - NO Pixi imports
 * - NO DOM reads
 * - Same seed always produces identical output (deterministic)
 *
 * Level layout:
 * - Start platform: 5 tiles (guaranteed safe spawn)
 * - Platform segments: 2-8 tiles wide
 * - Gap segments: 1-3 tiles wide (solvability checked)
 * - Barrier chance: max(0, (levelNumber-2)*0.08) capped at 0.40
 * - Level 1-2: no barriers
 * - Total length: 20 + (levelNumber * 5) tiles + finish
 * - Seed formula: levelNumber * 48271
 */

import { mulberry32, randInt } from './rng';
import type { LevelLayout, LevelTile } from './types';

// Physics constants (mirrored from physicsStep to keep generator pure)
const GRAVITY = 1800;
const JUMP_IMPULSE = 620; // magnitude
const TILE_WIDTH = 64;    // px

/** Compute barrier chance for a given level */
export function getBarrierChance(levelNumber: number): number {
  return Math.min(Math.max(0, (levelNumber - 2) * 0.08), 0.40);
}

/** Compute maximum safe gap in tiles for a given runner speed */
function maxSafeGapTiles(runnerSpeed: number): number {
  // jumpAirTime = 2 * jumpImpulse / gravity = 2 * 620 / 1800 ≈ 0.689 s
  const jumpAirTime = (2 * JUMP_IMPULSE) / GRAVITY;
  // Max horizontal distance = runnerSpeed * jumpAirTime
  const maxPx = runnerSpeed * jumpAirTime;
  return Math.floor(maxPx / TILE_WIDTH);
}

export interface GenerateLevelArgs {
  levelNumber: number;
  seed: number;
}

/**
 * Generates a level layout deterministically from levelNumber and seed.
 * Retries up to 20 times with seed+1 offset if solvability fails.
 * Falls back to full solid platform if all retries fail.
 */
export function generateLevel(args: GenerateLevelArgs): LevelLayout {
  const { levelNumber } = args;
  // Runner speed = min(180 + (levelNumber-1)*15, 300)
  const runnerSpeed = Math.min(180 + (levelNumber - 1) * 15, 300);
  const maxGapTiles = maxSafeGapTiles(runnerSpeed);
  const totalLength = 20 + levelNumber * 5;
  const barrierChance = getBarrierChance(levelNumber);

  for (let attempt = 0; attempt < 20; attempt++) {
    const trySeed = args.seed + attempt;
    const result = tryGenerate(levelNumber, trySeed, totalLength, maxGapTiles, barrierChance);
    if (result.solvable) {
      return result;
    }
  }

  // Fallback: full solid platform
  return fallbackLevel(levelNumber, args.seed, totalLength);
}

function tryGenerate(
  levelNumber: number,
  seed: number,
  totalLength: number,
  maxGapTiles: number,
  barrierChance: number,
): LevelLayout {
  const rng = mulberry32(seed);
  const tiles: LevelTile[] = [];
  let col = 0;
  let solvable = true;

  // Start platform: exactly 5 tiles, no barriers
  for (let i = 0; i < 5; i++) {
    tiles.push({ col, type: 'platform' });
    col++;
  }

  // Build mid-section up to totalLength - 2 (leave room for finish)
  while (col < totalLength - 2) {
    const remaining = totalLength - 2 - col;

    // Platform segment: 2-8 tiles
    const platLen = Math.min(randInt(rng, 2, 8), remaining);
    for (let i = 0; i < platLen; i++) {
      const isBarrier = i > 0 && i < platLen - 1 && rng() < barrierChance;
      tiles.push({ col, type: isBarrier ? 'barrier' : 'platform' });
      col++;
    }

    if (col >= totalLength - 2) break;

    // Gap segment: 1-3 tiles (clamped to maxGapTiles for solvability)
    const gapLen = Math.min(randInt(rng, 1, 3), maxGapTiles, remaining - 1);
    if (gapLen <= 0) break;

    // Check solvability
    if (gapLen > maxGapTiles) {
      solvable = false;
    }

    for (let i = 0; i < gapLen; i++) {
      tiles.push({ col, type: 'gap' });
      col++;
    }
  }

  // Finish line
  const finishCol = col;
  tiles.push({ col: finishCol, type: 'finish' });
  col++;

  return {
    tiles,
    totalCols: col,
    solvable,
    finishCol,
    seed,
  };
}

function fallbackLevel(levelNumber: number, seed: number, totalLength: number): LevelLayout {
  const tiles: LevelTile[] = [];
  for (let col = 0; col < totalLength; col++) {
    tiles.push({ col, type: 'platform' });
  }
  const finishCol = totalLength;
  tiles.push({ col: finishCol, type: 'finish' });

  return {
    tiles,
    totalCols: totalLength + 1,
    solvable: true,
    finishCol,
    seed,
  };
}
