/**
 * Scoring system — multiplicative formula
 *
 * levelScore = currentLevel * 1000 * speedMultiplier * retryPenaltyFactor
 * speedMultiplier = runnerSpeed / 180 (range 1.0–1.67)
 * retryPenaltyFactor = 1 / (1 + retryCount * 0.25)
 *
 * Pure function — no Math.random, no DOM, no Pixi (guardrail #9).
 */

export interface ScoreArgs {
  currentLevel: number;
  runnerSpeed: number;
  retryCount: number;
}

export function computeLevelScore(args: ScoreArgs): number {
  const { currentLevel, runnerSpeed, retryCount } = args;
  const speedMultiplier = runnerSpeed / 180;
  const retryPenaltyFactor = 1 / (1 + retryCount * 0.25);
  return Math.round(currentLevel * 1000 * speedMultiplier * retryPenaltyFactor);
}
