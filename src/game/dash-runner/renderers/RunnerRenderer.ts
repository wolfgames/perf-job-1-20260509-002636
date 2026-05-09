/**
 * RunnerRenderer — player character visual
 *
 * Runner is a 32×48 px flat colored rectangle (neon blue 🟦 fallback).
 * Fixed at x = viewportW * 0.25, y updated each frame from physics state.
 *
 * Destroy order: tweens → removeChild → destroy (guardrail #18).
 * Win flash: tint white 100ms. No per-frame allocation.
 */

import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';

const RUNNER_WIDTH = 32;
const RUNNER_HEIGHT = 48;
const RUNNER_TINT = 0x00aaff;   // neon blue — 🟦
const RUNNER_TINT_WIN = 0xffffff;
const WIGGLE_AMPLITUDE = 4;     // px
const WIGGLE_DURATION = 0.15;   // seconds

export class RunnerRenderer {
  /** Container holds bg Graphics + emoji label (design-smells.md: shape WITH label) */
  private runnerContainer: Container | null = null;
  private sprite: Graphics | null = null;
  private labelText: Text | null = null;
  private parent: Container | null = null;
  private pinX = 0;
  private originalTint = RUNNER_TINT;

  init(
    parent: Container,
    viewportW: number,
    _viewportH: number,
    _useFallback?: boolean,
  ): void {
    this.parent = parent;
    this.pinX = viewportW * 0.25;

    // Fallback: colored rectangle WITH emoji label (design-smells.md fallback priority)
    const container = new Container();
    container.x = this.pinX;
    container.y = 0; // will be set by updatePosition

    const g = new Graphics();
    g.rect(0, 0, RUNNER_WIDTH, RUNNER_HEIGHT).fill(RUNNER_TINT);

    // Emoji label identifies the runner as a character (not a blank shape)
    const label = new Text({
      text: '🟦',
      style: { fontSize: 20, fill: 0xffffff },
    });
    label.x = 2;
    label.y = 8;

    container.addChild(g);
    container.addChild(label);
    parent.addChild(container);

    this.runnerContainer = container;
    this.sprite = g;
    this.labelText = label;
    this.originalTint = RUNNER_TINT;
  }

  updatePosition(y: number): void {
    if (this.runnerContainer) {
      this.runnerContainer.y = y;
    }
  }

  getX(): number {
    return this.runnerContainer?.x ?? this.pinX;
  }

  getY(): number {
    return this.runnerContainer?.y ?? 0;
  }

  /**
   * Win flash: tint white over 100ms (via alpha on sprite), then restore.
   * Graphics shapes don't support pixi tint the same way Sprites do;
   * we use alpha oscillation as the flash signal.
   */
  playWinFlash(): void {
    if (!this.runnerContainer) return;
    const container = this.runnerContainer;
    gsap.to(container, {
      alpha: 0.2,
      duration: 0.05,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (container) container.alpha = 1;
      },
    });
  }

  /**
   * Airborne tap wiggle: ±4px x-oscillation, 150ms, 3 cycles.
   * Communicates "tap received but blocked" without implying double-jump.
   */
  wiggle(): void {
    if (!this.runnerContainer) return;
    const container = this.runnerContainer;
    const originX = this.pinX;
    gsap.to(container, {
      x: originX + WIGGLE_AMPLITUDE,
      duration: WIGGLE_DURATION / 6,
      repeat: 5,
      yoyo: true,
      ease: 'none',
      onComplete: () => {
        if (container) container.x = originX;
      },
    });
  }

  destroy(): void {
    // Destroy order: tweens → removeChild → destroy (guardrail #18)
    if (this.runnerContainer) {
      gsap.killTweensOf(this.runnerContainer);
      gsap.killTweensOf(this.sprite);
      this.parent?.removeChild(this.runnerContainer);
      this.labelText?.destroy();
      this.sprite?.destroy();
      this.runnerContainer.destroy({ children: true });
      this.runnerContainer = null;
      this.sprite = null;
      this.labelText = null;
    }
    this.parent = null;
  }
}
