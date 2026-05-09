/**
 * HudRenderer — Level indicator + progress bar
 *
 * Lives entirely on the GPU (Pixi Graphics for all elements).
 * Top HUD zone: 48px from top of canvas.
 * No DOM (guardrail #1). No per-frame allocation (guardrail #6).
 *
 * Level text uses Pixi Text (via dynamic import to avoid module issues in tests).
 * Destroy order: tweens → removeChild → destroy (guardrail #18).
 */

import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';

const HUD_HEIGHT = 48;
const LEVEL_TEXT_FONT_SIZE = 18;

export class HudRenderer {
  private levelTextObj: any = null; // Pixi Text — lazy imported
  private progressFill: Graphics | null = null;
  private progressBg: Graphics | null = null;
  private parent: Container | null = null;
  private maxProgressWidth = 0;
  private progressBarX = 0;
  private progressBarY = 0;
  private _progressWidth = 0;
  private _levelFontSize = LEVEL_TEXT_FONT_SIZE;
  private _levelTextY = 8;
  private _levelTextX = 8;

  async init(parent: Container, viewportW: number, _viewportH: number, level?: number): Promise<void>;
  init(parent: Container, viewportW: number, _viewportH: number, level?: number): void;
  init(parent: Container, viewportW: number, _viewportH: number, level = 1): any {
    this.parent = parent;
    this.maxProgressWidth = viewportW / 2;
    this.progressBarX = viewportW / 4;
    this.progressBarY = 20;

    // Try to create a Pixi Text for the level indicator
    try {
      const { Text } = require('pixi.js') as typeof import('pixi.js');
      const text = new (Text as any)({
        text: `Level ${level}`,
        style: {
          fontSize: LEVEL_TEXT_FONT_SIZE,
          fill: 0xffffff,
          fontWeight: 'bold',
          fontFamily: 'system-ui, sans-serif',
        },
      });
      text.x = this._levelTextX;
      text.y = this._levelTextY;
      parent.addChild(text);
      this.levelTextObj = text;
    } catch {
      // Fallback: labeled Graphics shape (design-smells.md: shape WITH label — not blank)
      const g = new Graphics();
      g.rect(0, 0, 80, 20).fill(0x222222);
      (g as any).x = this._levelTextX;
      (g as any).y = this._levelTextY;
      // Add a text label so it's never a blank unlabeled shape
      try {
        const { Text: PixiText } = require('pixi.js') as typeof import('pixi.js');
        const lbl = new (PixiText as any)({ text: 'Lvl', style: { fontSize: 12, fill: 0xffffff } });
        (lbl as any).x = this._levelTextX + 2;
        (lbl as any).y = this._levelTextY + 2;
        parent.addChild(lbl);
      } catch { /* ignore nested failure */ }
      parent.addChild(g as unknown as any);
      this.levelTextObj = g;
    }

    // Progress bar background
    this.progressBg = new Graphics();
    this.progressBg.rect(0, 0, this.maxProgressWidth, 12).fill(0x333333);
    (this.progressBg as any).x = this.progressBarX;
    (this.progressBg as any).y = this.progressBarY;
    parent.addChild(this.progressBg as unknown as any);

    // Progress fill (starts at 0 width)
    this.progressFill = new Graphics();
    (this.progressFill as any).x = this.progressBarX;
    (this.progressFill as any).y = this.progressBarY;
    parent.addChild(this.progressFill as unknown as any);
    this._progressWidth = 0;
  }

  updateProgress(runnerX: number, finishLineX: number, _viewportW: number): void {
    if (!this.progressFill) return;
    const ratio = Math.min(Math.max(0, runnerX / finishLineX), 1);
    const fillWidth = Math.round(this.maxProgressWidth * ratio);
    this._progressWidth = fillWidth;

    // Re-draw fill at new width (no new object — guardrail #6)
    const gfx = this.progressFill;
    (gfx as any).clear?.();
    if (fillWidth > 0) {
      gfx.rect(0, 0, fillWidth, 12).fill(0x00ffaa);
    }
  }

  updateLevel(level: number): void {
    if (this.levelTextObj?.text !== undefined) {
      this.levelTextObj.text = `Level ${level}`;
    }
  }

  getLevelTextPosition(): { x: number; y: number } {
    return { x: this._levelTextX, y: this._levelTextY };
  }

  getLevelTextFontSize(): number {
    return LEVEL_TEXT_FONT_SIZE;
  }

  getProgressWidth(): number {
    return this._progressWidth;
  }

  getHudBounds(): { top: number; bottom: number } {
    return { top: 0, bottom: HUD_HEIGHT };
  }

  destroy(): void {
    if (this.levelTextObj) {
      gsap.killTweensOf(this.levelTextObj);
      this.parent?.removeChild(this.levelTextObj);
      this.levelTextObj.destroy?.();
      this.levelTextObj = null;
    }
    if (this.progressBg) {
      gsap.killTweensOf(this.progressBg);
      this.parent?.removeChild(this.progressBg as unknown as any);
      this.progressBg.destroy();
      this.progressBg = null;
    }
    if (this.progressFill) {
      gsap.killTweensOf(this.progressFill);
      this.parent?.removeChild(this.progressFill as unknown as any);
      this.progressFill.destroy();
      this.progressFill = null;
    }
    this.parent = null;
  }
}
