/**
 * Results screen copy — exact strings for each outcome branch.
 * Exported as constants so tests can verify correct copy.
 *
 * GDD specifies:
 * - Loss: "Try Again?" (never "Game Over")
 * - Level Complete: "Level [N] Complete!"
 * - All-Clear: "You finished!"
 */

export const RESULTS_COPY = {
  loss: {
    heading: 'Try Again?',
    primaryCta: 'Retry',
    secondaryCta: null,
  },
  levelComplete: {
    /** Template — replace {N} with level number */
    heading: 'Level {N} Complete!',
    primaryCta: 'Next Level',
    secondaryCta: 'See Results',
  },
  allClear: {
    heading: 'You finished!',
    primaryCta: 'Play Again',
    secondaryCta: null,
  },
} as const;

/** Minimum touch target height for all result screen CTAs (pixels) */
export const RESULTS_BUTTON_MIN_HEIGHT = 44;

/** Format level-complete heading with actual level number */
export function formatLevelCompleteHeading(level: number): string {
  return `Level ${level} Complete!`;
}
