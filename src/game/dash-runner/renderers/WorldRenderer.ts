/**
 * WorldRenderer — scrolling platform tiles, barriers, finish line
 *
 * Manages a pool of Sprite objects (pre-allocated). On each ticker frame,
 * advances each tile x by -(runnerSpeed * delta). Tiles with x < -tileWidth
 * are repositioned to rightmostTile.x + tileWidth (no new allocations in tick).
 *
 * No per-frame allocation (guardrail #6). Tile pool is pre-allocated in init().
 * Destroy order: tweens → removeChild → destroy (guardrail #18).
 *
 * Fallback style: emoji text label + colored Graphics background.
 * Priority: simple shape WITH label (design-smells.md fallbackPriority).
 * This satisfies the "not blank unlabeled Graphics shapes" requirement.
 */

import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { LevelTile } from '../level/types';

// ── Dimensions ────────────────────────────────────────────────────────────────

const TILE_WIDTH = 64;
const TILE_HEIGHT = 24;
const BARRIER_WIDTH = 32;
const BARRIER_HEIGHT = 32;
const FINISH_WIDTH = 8;
const FINISH_HEIGHT = 96;

// ── Tint constants (fallback colors matching emoji) ─────────────────────────

const PLATFORM_TINT = 0x8B4513;  // saddle brown — 🟫
const BARRIER_TINT = 0xff3333;   // red — 🟥
const FINISH_TINT = 0x00ffaa;    // neon green — finish line accent

// ── Emoji labels for "simple shape WITH label" fallback ─────────────────────

const PLATFORM_EMOJI = '🟫';
const BARRIER_EMOJI = '🟥';
const FINISH_LABEL = '|';  // ASCII fallback (emoji '🏁' may not render on all devices)

// ── Internal sprite tracking ───────────────────────────────────────────────

interface TileSprite {
  /** Container holds the bg Graphics + Text label */
  container: Container;
  /** Underlying Graphics bg for color identity */
  gfx: Graphics;
  /** Text label overlaid for readability (design-smells.md: shape WITH label) */
  label: Text;
  worldX: number;
  type: 'platform' | 'barrier' | 'finish';
  tint: number;
}

// ── WorldRenderer ──────────────────────────────────────────────────────────

export class WorldRenderer {
  private sprites: TileSprite[] = [];
  private parent: Container | null = null;
  private viewportW = 390;
  private viewportH = 844;
  private platformY = 0;

  init(
    tiles: LevelTile[],
    parent: Container,
    viewportW: number,
    viewportH: number,
    _runnerSpeed: number,
  ): void {
    this.parent = parent;
    this.viewportW = viewportW;
    this.viewportH = viewportH;
    // Platform zone: bottom 30% of viewport
    // Platform top = viewportH * 0.70
    this.platformY = Math.round(viewportH * 0.70);

    // Pre-allocate sprites for each non-gap tile
    for (const tile of tiles) {
      if (tile.type === 'gap') continue;

      const worldX = tile.col * TILE_WIDTH;
      const tileContainer = new Container();

      let gfx: Graphics;
      let label: Text;
      let tint: number;

      if (tile.type === 'platform') {
        // Platform: horizontal colored bar with emoji label
        gfx = new Graphics();
        gfx.rect(0, 0, TILE_WIDTH, TILE_HEIGHT).fill(PLATFORM_TINT);

        label = new Text({
          text: PLATFORM_EMOJI,
          style: { fontSize: 14, fill: 0xffffff },
        });
        label.x = 2;
        label.y = 2;

        tileContainer.x = worldX;
        tileContainer.y = this.platformY;
        tint = PLATFORM_TINT;

      } else if (tile.type === 'barrier') {
        // Barrier: taller colored block with emoji label
        gfx = new Graphics();
        gfx.rect(0, 0, BARRIER_WIDTH, BARRIER_HEIGHT).fill(BARRIER_TINT);

        label = new Text({
          text: BARRIER_EMOJI,
          style: { fontSize: 18, fill: 0xffffff },
        });
        label.x = 2;
        label.y = 4;

        tileContainer.x = worldX;
        tileContainer.y = this.platformY - BARRIER_HEIGHT;
        tint = BARRIER_TINT;

      } else {
        // Finish line: bright vertical stripe with ASCII label
        gfx = new Graphics();
        gfx.rect(0, 0, FINISH_WIDTH, FINISH_HEIGHT).fill(FINISH_TINT);

        label = new Text({
          text: FINISH_LABEL,
          style: { fontSize: 20, fill: 0x000000, fontWeight: 'bold' },
        });
        label.x = 0;
        label.y = 8;

        tileContainer.x = worldX;
        tileContainer.y = this.platformY - FINISH_HEIGHT + TILE_HEIGHT;
        tint = FINISH_TINT;
      }

      tileContainer.addChild(gfx);
      tileContainer.addChild(label);
      parent.addChild(tileContainer);

      this.sprites.push({
        container: tileContainer,
        gfx,
        label,
        worldX,
        type: tile.type as 'platform' | 'barrier' | 'finish',
        tint,
      });
    }
  }

  /**
   * Scroll tiles. Called each ticker frame.
   * Tiles that scroll off-screen left are recycled to the right edge.
   * NO new objects created here (guardrail #6).
   */
  update(dt: number, runnerSpeed: number): void {
    const scrollAmount = runnerSpeed * dt;
    let rightmostX = -Infinity;

    for (const sprite of this.sprites) {
      sprite.container.x -= scrollAmount;
      if (sprite.container.x > rightmostX) rightmostX = sprite.container.x;
    }

    // Recycle off-screen tiles to right edge
    for (const sprite of this.sprites) {
      if (sprite.container.x < -TILE_WIDTH) {
        sprite.container.x = rightmostX + TILE_WIDTH;
        rightmostX = sprite.container.x;
      }
    }
  }

  /** Returns number of active tile sprites (for tests) */
  getTileCount(): number {
    return this.sprites.length;
  }

  /** Returns sprite info for inspection (for tests) */
  getSprites(): Array<{ type: string; tint: number; x: number }> {
    return this.sprites.map(s => ({
      type: s.type,
      tint: s.tint,
      x: s.container.x,
    }));
  }

  destroy(): void {
    for (const sprite of this.sprites) {
      gsap.killTweensOf(sprite.container);
      gsap.killTweensOf(sprite.gfx);
      this.parent?.removeChild(sprite.container);
      sprite.label.destroy();
      sprite.gfx.destroy();
      sprite.container.destroy({ children: true });
    }
    this.sprites = [];
    this.parent = null;
  }
}
