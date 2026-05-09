/**
 * GameController — Dash Runner
 *
 * Replaces the DOM mode stub with a full Pixi GPU implementation.
 * Contract shape (setupGame → GameController with init/destroy/ariaText) is preserved.
 *
 * Lifecycle:
 *   1. ECS DB created from dashPlugin → setActiveDb(db) → bridgeEcsToSignals(db)
 *   2. Pixi Application initialized → layers created (bg, world, ui)
 *   3. Renderers instantiated with stage layers and layout bounds
 *   4. Input routed from app.stage via pointertap
 *   5. Game actions dispatched through db.transactions.*
 *
 * Destroy order (guardrails #2/#18): GSAP tweens → Pixi app → ECS bridge → setActiveDb(null)
 */

import { createSignal } from 'solid-js';
import { Application, Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { Database } from '@adobe/data/ecs';
import { setActiveDb } from '~/core/systems/ecs';
import { gameState } from '~/game/state';
import type {
  GameController,
  GameControllerDeps,
  SetupGame,
} from '~/game/mygame-contract';
import { dashPlugin, bridgeEcsToSignals } from './state/DashPlugin';
import { WorldRenderer } from './renderers/WorldRenderer';
import { RunnerRenderer } from './renderers/RunnerRenderer';
import { HudRenderer } from './renderers/HudRenderer';
import { generateLevel } from './level/levelGenerator';
import { physicsStep, handleTap } from './physics/physicsStep';
import { createTransitionManager } from './transitions';
import type { PhysicsState } from './physics/types';
import { VIEWPORT_HEIGHT } from './physics/types';

// ── Constants ────────────────────────────────────────────────────────────

const VIEWPORT_WIDTH = 390;
const HUD_TOP_PX = 48;
const DOM_RESERVED_BOTTOM = 64;
const BACKGROUND_COLOR = 0x000000;
const TILE_WIDTH = 64;

// ── Factory ──────────────────────────────────────────────────────────────

export const setupGame: SetupGame = (deps: GameControllerDeps): GameController => {
  const [ariaText, setAriaText] = createSignal('Game loading...');

  let app: Application | null = null;
  let bgLayer: Container | null = null;
  let worldLayer: Container | null = null;
  let uiLayer: Container | null = null;
  let hudLayer: Container | null = null;
  let ecsDb: ReturnType<typeof Database.create<typeof dashPlugin>> | null = null;
  let cleanupBridge: (() => void) | null = null;

  // Renderers
  let worldRenderer: WorldRenderer | null = null;
  let runnerRenderer: RunnerRenderer | null = null;
  let hudRenderer: HudRenderer | null = null;
  let transitionManager: ReturnType<typeof createTransitionManager> | null = null;

  // Physics state (mutable reference; updated each ticker frame)
  let physicsState: PhysicsState | null = null;

  // Ticker cleanup
  let tickerFn: ((ticker: { deltaTime: number }) => void) | null = null;

  // ── Background grid ────────────────────────────────────────────────────

  function drawBackground(layer: Container, w: number, h: number) {
    const bg = new Graphics();
    // Dark background fill
    bg.rect(0, 0, w, h).fill(BACKGROUND_COLOR);

    // Neon grid lines
    const GRID_SIZE = 40;
    const LINE_COLOR = 0x00ff88;
    const LINE_ALPHA = 0.15;

    for (let x = 0; x <= w; x += GRID_SIZE) {
      bg.moveTo(x, 0).lineTo(x, h).stroke({ color: LINE_COLOR, alpha: LINE_ALPHA, width: 1 });
    }
    for (let y = 0; y <= h; y += GRID_SIZE) {
      bg.moveTo(0, y).lineTo(w, y).stroke({ color: LINE_COLOR, alpha: LINE_ALPHA, width: 1 });
    }

    layer.addChild(bg);
  }

  return {
    gameMode: 'pixi',
    ariaText,

    async init(container: HTMLDivElement) {
      setAriaText('Gameplay Screen');

      // ── ECS init ─────────────────────────────────────────────────────
      ecsDb = Database.create(dashPlugin);
      setActiveDb(ecsDb as any);

      // Restore persistent state from signals — signals survive ECS destroy/recreate.
      // Level and accumulated score carry over across sessions (level progression + multi-level score).
      const resumeLevel = gameState.level();
      const resumeScore = gameState.score();
      if (resumeLevel > 1) {
        ecsDb.transactions.setLevel({ level: resumeLevel });
      }
      if (resumeScore > 0) {
        ecsDb.transactions.addScore({ amount: resumeScore });
      }

      cleanupBridge = bridgeEcsToSignals(ecsDb, gameState);

      // ── Pixi Application ──────────────────────────────────────────────
      app = new Application();
      await app.init({
        resizeTo: container,
        background: BACKGROUND_COLOR,
        resolution: Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1, 2),
        autoDensity: true,
      });

      container.appendChild(app.canvas as HTMLCanvasElement);

      const w = app.screen.width || VIEWPORT_WIDTH;
      const h = app.screen.height || VIEWPORT_HEIGHT;

      // ── Layer stack ───────────────────────────────────────────────────
      // bg-layer: no interactive children — eventMode 'none'
      bgLayer = new Container();
      bgLayer.label = 'bg-layer';
      bgLayer.eventMode = 'none';

      // world-layer: HAS interactive game content — eventMode 'passive'
      worldLayer = new Container();
      worldLayer.label = 'world-layer';
      worldLayer.eventMode = 'passive';

      // hud-layer: overlays HUD — eventMode 'none' (HUD is info only)
      hudLayer = new Container();
      hudLayer.label = 'hud-layer';
      hudLayer.eventMode = 'none';

      // ui-layer: overlays and buttons — eventMode 'passive'
      uiLayer = new Container();
      uiLayer.label = 'ui-layer';
      uiLayer.eventMode = 'passive';

      app.stage.addChild(bgLayer);
      app.stage.addChild(worldLayer);
      app.stage.addChild(hudLayer);
      app.stage.addChild(uiLayer);
      app.stage.eventMode = 'static';

      // ── Draw background ───────────────────────────────────────────────
      drawBackground(bgLayer, w, h);

      // ── Generate initial level ────────────────────────────────────────
      const currentLevel = (ecsDb as any).store.resources.currentLevel as number;
      const runnerSpeed = (ecsDb as any).store.resources.runnerSpeed as number;
      const seed = currentLevel * 48271;
      const level = generateLevel({ levelNumber: currentLevel, seed });

      // ── World renderer ────────────────────────────────────────────────
      worldRenderer = new WorldRenderer();
      worldRenderer.init(level.tiles, worldLayer, w, h, runnerSpeed);

      // ── Runner renderer ───────────────────────────────────────────────
      // Runner ground Y = platform top (70% of viewport height), adjusted for runner height
      const platformY = Math.round(h * 0.70);
      const RUNNER_HEIGHT = 48;
      const groundY = platformY - RUNNER_HEIGHT;

      runnerRenderer = new RunnerRenderer();
      runnerRenderer.init(worldLayer, w, h);
      runnerRenderer.updatePosition(groundY);

      // ── HUD renderer ──────────────────────────────────────────────────
      hudRenderer = new HudRenderer();
      hudRenderer.init(hudLayer, w, h, currentLevel);

      // ── Overlay for transitions ───────────────────────────────────────
      const overlay = new Graphics();
      overlay.rect(0, 0, w, h).fill(0x000000);
      (overlay as any).alpha = 0;
      uiLayer.addChild(overlay);

      // ── Transition manager ────────────────────────────────────────────
      const goto = (deps as any).goto ?? ((screen: string) => {
        // fallback: no-op if goto not provided in test context
        void screen;
      });
      transitionManager = createTransitionManager({
        db: ecsDb as any,
        goto,
        overlay,
      });

      // ── Initial physics state ─────────────────────────────────────────
      // Convert tile layout to physics Tile format (world-space positions)
      const physicsTiles = level.tiles
        .filter(t => t.type !== 'gap')
        .map(t => ({
          x: t.col * TILE_WIDTH,
          y: t.type === 'barrier' ? platformY - 32 : platformY,
          width: t.type === 'barrier' ? 32 : TILE_WIDTH,
          height: t.type === 'barrier' ? 32 : 24,
          type: t.type as 'platform' | 'barrier' | 'finish' | 'gap',
        }));

      physicsState = {
        runnerX: runnerRenderer.getX(),
        runnerY: groundY,
        vy: 0,
        grounded: true,
        gamePhase: 'idle',
        tiles: physicsTiles,
        finishLineX: level.finishCol * TILE_WIDTH,
      };

      // ── Tap input handler ─────────────────────────────────────────────
      // Single listener on stage (guardrail: no second input path)
      app.stage.on('pointertap', () => {
        if (!ecsDb || !physicsState) return;
        const phase = physicsState.gamePhase;
        handleTap(phase, ecsDb as any, () => {
          runnerRenderer?.wiggle();
        });
        // Sync physics state when jump fires
        if (phase === 'idle') {
          physicsState = { ...physicsState, vy: -620, grounded: false, gamePhase: 'airborne' };
        }
      });

      // ── Physics + render ticker ───────────────────────────────────────
      let lastWon = false;
      let lastLost = false;

      tickerFn = ({ deltaTime }: { deltaTime: number }) => {
        if (!physicsState || !ecsDb) return;

        // dt in seconds (deltaTime is in frames at 60fps)
        const dt = deltaTime / 60;

        const currentSpeed = (ecsDb as any).store.resources.runnerSpeed as number;

        // Advance runner world-X by scroll amount each frame.
        // The runner is visually pinned at 25% from left, but logically it moves
        // through the world at runnerSpeed px/s. physicsStep uses runnerX to detect
        // finish line and tile collisions in world space.
        if (physicsState.gamePhase !== 'won' && physicsState.gamePhase !== 'lost' && physicsState.gamePhase !== 'animating') {
          physicsState = { ...physicsState, runnerX: physicsState.runnerX + currentSpeed * dt };
        }

        // Step physics
        physicsState = physicsStep(physicsState, dt);

        // Sync runner visual position
        runnerRenderer?.updatePosition(physicsState.runnerY);

        // Scroll world
        worldRenderer?.update(dt, currentSpeed);

        // Update HUD progress
        hudRenderer?.updateProgress(
          physicsState.runnerX,
          physicsState.finishLineX,
          w,
        );

        // Check phase transitions (won/lost)
        if (physicsState.gamePhase === 'won' && !lastWon) {
          lastWon = true;
          ecsDb.transactions.finalizeScore();
          transitionManager?.handleWin(() => {
            runnerRenderer?.playWinFlash();
          });
        } else if (physicsState.gamePhase === 'lost' && !lastLost) {
          lastLost = true;
          ecsDb.transactions.setLoss();
          transitionManager?.handleLoss();
        }
      };

      app.ticker.add(tickerFn as any);

      setAriaText('Gameplay Screen — Tap to jump');
    },

    destroy() {
      // Remove ticker first to stop any in-flight physics
      if (tickerFn && app) {
        app.ticker.remove(tickerFn as any);
      }
      tickerFn = null;

      // Destroy order: GSAP tweens → Pixi app → ECS bridge → setActiveDb(null)
      // Kill all renderer tweens before any Pixi destruction
      runnerRenderer?.destroy();
      runnerRenderer = null;

      worldRenderer?.destroy();
      worldRenderer = null;

      hudRenderer?.destroy();
      hudRenderer = null;

      transitionManager?.destroy();
      transitionManager = null;

      if (app?.stage) gsap.killTweensOf(app.stage);
      if (bgLayer) gsap.killTweensOf(bgLayer);
      if (worldLayer) gsap.killTweensOf(worldLayer);
      if (hudLayer) gsap.killTweensOf(hudLayer);
      if (uiLayer) gsap.killTweensOf(uiLayer);

      app?.destroy(true, { children: true });
      app = null;
      bgLayer = null;
      worldLayer = null;
      hudLayer = null;
      uiLayer = null;

      cleanupBridge?.();
      cleanupBridge = null;

      setActiveDb(null);
      ecsDb = null;
      physicsState = null;
    },
  };
};
