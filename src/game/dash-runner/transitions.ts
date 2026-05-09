/**
 * Transition Manager — Win/Loss screen transitions
 *
 * Win sequence:
 *   1. setPhase('animating') — input blocked
 *   2. runner.playWinFlash() — 100ms tint white
 *   3. delayedCall(0.1) → overlay fade 0→1 over 200ms
 *   4. onComplete → goto('results')
 *
 * Loss sequence:
 *   1. setPhase('animating') — input blocked
 *   2. delayedCall(0.2) → allow runner to fall for 200ms
 *   3. overlay fade 0→1 over 200ms
 *   4. onComplete → goto('results')
 *
 * Overlay is a Pixi Graphics fullscreen rect added to ui-layer.
 * Destroy order: tweens → removeChild → destroy (guardrail #18/#2).
 */

import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { DashDatabase } from './state/DashPlugin';

export interface TransitionManagerArgs {
  db: DashDatabase;
  goto: (screen: string) => void;
  overlay?: Graphics;
}

export interface TransitionManager {
  handleWin(onFlash: () => void): void;
  handleLoss(): void;
  destroy(): void;
}

export function createTransitionManager(args: TransitionManagerArgs): TransitionManager {
  const { db, goto } = args;

  // Create overlay for fade-to-black
  const overlay = args.overlay ?? new Graphics();
  overlay.rect(0, 0, 390, 844).fill(0x000000);
  (overlay as any).alpha = 0;

  function fadeToResults() {
    // Animate overlay alpha 0→1 over 200ms (not instant — guardrail animated-dynamics)
    gsap.to(overlay, {
      alpha: 1,
      duration: 0.2,
      onComplete: () => {
        goto('results');
      },
    });
  }

  return {
    handleWin(onFlash: () => void) {
      // Block input
      db.transactions.setPhase({ phase: 'animating' });
      // Runner flash
      onFlash();
      // Delay 100ms (flash duration), then fade
      gsap.delayedCall(0.1, () => {
        fadeToResults();
      });
    },

    handleLoss() {
      // Block input
      db.transactions.setPhase({ phase: 'animating' });
      // Allow runner to fall 200ms, then fade
      gsap.delayedCall(0.2, () => {
        fadeToResults();
      });
    },

    destroy() {
      // Kill all tweens before destroying
      gsap.killTweensOf(overlay);
      overlay.destroy();
    },
  };
}
