/**
 * Dash Runner Start View
 *
 * Full visual identity for Batch 6:
 * - Dark background (#0a0a1a)
 * - "Dash Runner" title in neon accent (#00FFAA)
 * - "Tap to jump" instruction (≥16px, ≥4.5:1 contrast)
 * - Large Play button (neon accent, ≥44px, center thumb zone)
 * - Loading indicator appears during GPU init
 * - Audio unlock fires BEFORE initGpu (mobile-constraints.mdc)
 */

import type {
  StartScreenDeps,
  StartScreenController,
  SetupStartScreen,
} from '~/game/mygame-contract';

// ── Copy constants (tested) ────────────────────────────────────────────────

export const START_SCREEN_COPY = {
  title: 'Dash Runner',
  instruction: 'Tap to jump',
  cta: 'Play',
  loading: 'Loading...',
} as const;

/** Minimum touch target height for Play button (px) — mobile-constraints.mdc */
export const START_BUTTON_MIN_HEIGHT = 44;

// ── Factory ────────────────────────────────────────────────────────────────

export const setupStartScreen: SetupStartScreen = (deps: StartScreenDeps): StartScreenController => {
  let wrapper: HTMLDivElement | null = null;

  return {
    backgroundColor: '#0a0a1a',

    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText =
        'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:24px;background:#0a0a1a;';

      // Title — neon accent, large
      const title = document.createElement('h1');
      title.textContent = START_SCREEN_COPY.title;
      title.style.cssText =
        'font-size:2.5rem;font-weight:700;color:#00FFAA;margin:0;font-family:system-ui,sans-serif;letter-spacing:0.04em;';

      // Instruction — white body text (≥16px, ≥4.5:1 contrast on #0a0a1a)
      const instruction = document.createElement('p');
      instruction.textContent = START_SCREEN_COPY.instruction;
      instruction.style.cssText =
        'font-size:1rem;color:#ffffff;margin:0;font-family:system-ui,sans-serif;opacity:0.85;';

      // Play button — neon accent border, min 44×200px (center thumb zone)
      const playBtn = document.createElement('button');
      playBtn.textContent = START_SCREEN_COPY.cta;
      playBtn.style.cssText =
        `font-size:1.25rem;font-weight:600;padding:14px 48px;` +
        `border:2px solid #00FFAA;border-radius:12px;` +
        `background:transparent;color:#00FFAA;cursor:pointer;` +
        `font-family:system-ui,sans-serif;` +
        `min-height:${START_BUTTON_MIN_HEIGHT}px;min-width:200px;` +
        `touch-action:none;`;

      // Loading indicator (hidden until Play is tapped)
      const loadingEl = document.createElement('p');
      loadingEl.textContent = START_SCREEN_COPY.loading;
      loadingEl.style.cssText =
        'color:#ffffff;display:none;font-family:system-ui,sans-serif;font-size:1rem;opacity:0.7;';

      // CSS spinner (DOM only — pre-GPU; guardrail #1 — no Pixi before initGpu)
      const spinner = document.createElement('div');
      spinner.style.cssText =
        'width:32px;height:32px;border:3px solid rgba(0,255,170,0.3);' +
        'border-top-color:#00FFAA;border-radius:50%;display:none;' +
        'animation:spin 0.8s linear infinite;';
      const style = document.createElement('style');
      style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head?.appendChild(style);

      playBtn.addEventListener('click', async () => {
        playBtn.disabled = true;
        loadingEl.style.display = 'block';
        spinner.style.display = 'block';

        // Mobile audio gate MUST fire before any audio playback (mobile-constraints.mdc)
        deps.unlockAudio();

        await deps.initGpu();
        await deps.loadCore();
        try { await deps.loadAudio(); } catch { /* audio optional */ }
        deps.analytics.trackGameStart({ start_source: 'play_button', is_returning_player: false });
        deps.goto('game');
      }, { once: true });

      wrapper.append(title, instruction, playBtn, loadingEl, spinner);
      container.append(wrapper);
    },

    destroy() {
      wrapper?.remove();
      wrapper = null;
    },
  };
};
