import { onMount, createMemo, Show } from 'solid-js';
import { Spinner } from '@wolfgames/components/solid';
import { useScreen } from '~/core/systems/screens';
import { useAssets, useLoadingState } from '~/core/systems/assets';
import { useManifest } from '@wolfgames/components/solid';
import { useTuning, type ScaffoldTuning } from '~/core';
import { Logo } from '~/core/ui/Logo';
import type { GameTuning } from '~/game/tuning';

export function LoadingScreen() {
  const { goto } = useScreen();
  const assets = useAssets();
  const loadingState = useLoadingState();
  const { manifest } = useManifest();
  const tuning = useTuning<ScaffoldTuning, GameTuning>();

  const m = manifest();
  const bundlesByPrefix = (prefix: string) =>
    m.bundles.filter((b) => b.name.startsWith(prefix)).map((b) => b.name);

  const bootBundles = bundlesByPrefix('boot-');
  const themeBundles = bundlesByPrefix('theme-');
  const coreBundles = bundlesByPrefix('core-');
  const audioBundles = bundlesByPrefix('audio-');

  const shouldSkipStartScreen = (): boolean => {
    if (tuning.game.devMode?.skipStartScreen) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'game';
  };

  const skipToGame = shouldSkipStartScreen();

  const targetBundles = skipToGame
    ? [...bootBundles, ...themeBundles, ...coreBundles, ...audioBundles]
    : [...bootBundles, ...themeBundles];

  const progress = createMemo(() => {
    const s = loadingState();
    if (targetBundles.length === 0) return 100;
    let sum = 0;
    for (const name of targetBundles) {
      if (s.loaded.includes(name)) {
        sum += 1;
      } else if (s.loading.includes(name)) {
        sum += 0.5;
      }
    }
    return (sum / targetBundles.length) * 100;
  });

  const themeLoaded = createMemo(() => {
    const s = loadingState();
    return themeBundles.every((b) => s.loaded.includes(b));
  });

  const failedBundles = createMemo(() => {
    const s = loadingState();
    return targetBundles.filter((name) => name in s.errors);
  });

  const retryFailed = async () => {
    const failed = failedBundles();
    for (const name of failed) {
      await assets.loadBundle(name);
    }
  };

  onMount(async () => {
    try {
      if (skipToGame) {
        await assets.loadBoot();
        await assets.loadTheme();

        assets.unlockAudio();
        await assets.initGpu();
        await assets.loadCore();
        try {
          await assets.loadAudio();
        } catch (err) {
          console.warn('Audio loading failed:', err);
        }
        await new Promise((r) => setTimeout(r, 300));
        await goto('game');
      } else {
        await assets.loadBoot();
        await assets.loadTheme();
        await new Promise((r) => setTimeout(r, 500));
        await goto('start');
      }
    } catch (err) {
      console.error('Failed to load initial assets:', err);
    }
  });

  return (
    <div class="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#0a0a1a' }}>
      <Show
        when={failedBundles().length === 0}
        fallback={
          <div class="text-center max-w-sm px-6">
            <p class="text-lg font-semibold mb-2" style={{ color: '#00FFAA' }}>Unable to load</p>
            <p class="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Failed to load: {failedBundles().join(', ')}
            </p>
            <button
              onClick={retryFailed}
              class="px-6 py-3 rounded-xl font-medium active:scale-95 transition-all"
              style={{ background: 'transparent', color: '#00FFAA', border: '2px solid #00FFAA', 'min-height': '44px' }}
            >
              Retry
            </button>
          </div>
        }
      >
        <Spinner size="lg" class="w-24 h-24" style={{ color: '#00FFAA' }} />
        <div class="mt-8 w-64 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,255,170,0.15)' }}>
          <div
            class="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress()}%`, background: '#00FFAA' }}
          />
        </div>
      </Show>

      {themeLoaded() && (
        <div class="absolute bottom-8">
          <Logo />
        </div>
      )}
    </div>
  );
}
