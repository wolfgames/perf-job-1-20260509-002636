/**
 * Results Screen — Dash Runner
 *
 * Three outcome branches (guardrail #15 — no placeholder/scaffold content):
 * 1. Loss: "Try Again?" + Retry button
 * 2. Level Complete: "Level N Complete!" + Next Level
 * 3. All-Clear: "You finished!" + Play Again
 *
 * Dark neon theme (#0a0a1a bg, #00FFAA accent).
 * Touch targets ≥ 44px (mobile-constraints.mdc).
 */

import { Show } from 'solid-js';
import { useScreen } from '~/core/systems/screens';
import { Button } from '~/core/ui/Button';
import { gameState } from '~/game/state';
import {
  RESULTS_COPY,
  RESULTS_BUTTON_MIN_HEIGHT,
  formatLevelCompleteHeading,
} from '~/game/dash-runner/screens/resultsCopy';

const buttonStyle = {
  'min-height': `${RESULTS_BUTTON_MIN_HEIGHT}px`,
  'min-width': '160px',
};

export function ResultsScreen() {
  const { goto } = useScreen();

  const isLoss = () => gameState.isLoss();
  const isAllClear = () => gameState.isAllClear();
  const isLevelComplete = () => !isLoss() && !isAllClear();

  const handleRetry = () => {
    goto('game');
  };

  const handleNextLevel = () => {
    goto('game');
  };

  const handlePlayAgain = () => {
    gameState.reset();
    goto('game');
  };

  const handleMainMenu = () => {
    gameState.reset();
    goto('start');
  };

  return (
    <div
      class="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0a1a' }}
    >
      {/* LOSS BRANCH */}
      <Show when={isLoss()}>
        <h1 style={{ color: '#00FFAA', 'font-size': '2rem', 'font-weight': '700', margin: '0 0 16px' }}>
          {RESULTS_COPY.loss.heading}
        </h1>
        <div style={{ 'text-align': 'center', 'margin-bottom': '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', 'font-size': '0.875rem', margin: '0 0 4px' }}>Score</p>
          <p style={{ 'font-size': '3rem', 'font-weight': '700', color: '#fff', margin: '0' }}>
            {gameState.score()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button onClick={handleRetry} style={buttonStyle}>
            {RESULTS_COPY.loss.primaryCta}
          </Button>
          <Button variant="secondary" onClick={handleMainMenu} style={buttonStyle}>
            Main Menu
          </Button>
        </div>
      </Show>

      {/* LEVEL COMPLETE BRANCH */}
      <Show when={isLevelComplete()}>
        <h1 style={{ color: '#00FFAA', 'font-size': '2rem', 'font-weight': '700', margin: '0 0 16px', 'text-align': 'center' }}>
          {formatLevelCompleteHeading(gameState.level())}
        </h1>
        <div style={{ 'text-align': 'center', 'margin-bottom': '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', 'font-size': '0.875rem', margin: '0 0 4px' }}>Score</p>
          <p style={{ 'font-size': '3rem', 'font-weight': '700', color: '#fff', margin: '0' }}>
            {gameState.score()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button onClick={handleNextLevel} style={buttonStyle}>
            {RESULTS_COPY.levelComplete.primaryCta}
          </Button>
        </div>
      </Show>

      {/* ALL-CLEAR BRANCH */}
      <Show when={isAllClear()}>
        <h1 style={{ color: '#00FFAA', 'font-size': '2rem', 'font-weight': '700', margin: '0 0 8px', 'text-align': 'center' }}>
          {RESULTS_COPY.allClear.heading}
        </h1>
        <p style={{ color: '#fff', 'font-size': '1rem', margin: '0 0 16px', 'text-align': 'center' }}>
          Levels Cleared: {gameState.levelsCleared()}
        </p>
        <div style={{ 'text-align': 'center', 'margin-bottom': '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', 'font-size': '0.875rem', margin: '0 0 4px' }}>Final Score</p>
          <p style={{ 'font-size': '3rem', 'font-weight': '700', color: '#fff', margin: '0' }}>
            {gameState.score()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button onClick={handlePlayAgain} style={buttonStyle}>
            {RESULTS_COPY.allClear.primaryCta}
          </Button>
          <Button variant="secondary" onClick={handleMainMenu} style={buttonStyle}>
            Main Menu
          </Button>
        </div>
      </Show>
    </div>
  );
}
