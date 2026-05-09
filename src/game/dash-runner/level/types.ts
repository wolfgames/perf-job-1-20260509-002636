/**
 * Level generator types
 */

export interface LevelTile {
  /** Tile column index (0-based) */
  col: number;
  type: 'platform' | 'barrier' | 'gap' | 'finish';
}

export interface LevelLayout {
  /** Ordered array of tiles by column */
  tiles: LevelTile[];
  /** Total number of columns */
  totalCols: number;
  /** Whether the level is solvable (max gap ≤ jump reach) */
  solvable: boolean;
  /** Finish line column */
  finishCol: number;
  /** Seed used to generate this level */
  seed: number;
}
