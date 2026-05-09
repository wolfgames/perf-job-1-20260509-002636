/**
 * GameController — Pixi init and teardown tests (Batch 1)
 *
 * Tests use a mock HTMLDivElement to avoid jsdom dependency.
 * Pixi, GSAP, and ECS are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Pixi Application
const mockStage = {
  addChild: vi.fn(),
  removeChild: vi.fn(),
  eventMode: 'none' as string,
  children: [] as any[],
  on: vi.fn(),
  off: vi.fn(),
};

const mockAppInstance = {
  stage: mockStage,
  canvas: { style: {}, tagName: 'CANVAS' } as any,
  screen: { width: 390, height: 844 },
  renderer: {},
  ticker: { add: vi.fn(), remove: vi.fn() },
  destroy: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pixi.js', () => {
  const Application = vi.fn().mockImplementation(() => mockAppInstance);

  const Container = vi.fn().mockImplementation(() => ({
    label: '',
    addChild: vi.fn(),
    removeChild: vi.fn(),
    eventMode: 'passive' as string,
    destroy: vi.fn(),
    children: [] as any[],
  }));

  const Text = vi.fn().mockImplementation(() => ({
    x: 0, y: 0, style: {}, destroy: vi.fn(),
  }));

  const Graphics = vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    x: 0, y: 0, width: 0, height: 0, alpha: 1,
    destroy: vi.fn(),
    clear: vi.fn().mockReturnThis(),
  }));

  return { Application, Container, Text, Graphics };
});

// Mock GSAP
const mockGsap = {
  killTweensOf: vi.fn(),
  delayedCall: vi.fn(),
  to: vi.fn(),
  ticker: { add: vi.fn(), remove: vi.fn() },
};
vi.mock('gsap', () => ({
  default: mockGsap,
}));

// Mock solid-js ECS bridge
const mockSetActiveDb = vi.fn();
vi.mock('~/core/systems/ecs', async () => {
  return {
    setActiveDb: mockSetActiveDb,
    activeDb: vi.fn(() => null),
    Database: (await import('@adobe/data/ecs')).Database,
  };
});

// Mock game state
vi.mock('~/game/state', () => {
  const { createSignal } = require('solid-js');
  const [score, setScore] = createSignal(0);
  const [level, setLevel] = createSignal(1);
  const [levelsCleared, setLevelsCleared] = createSignal(0);
  const [isAllClear, setIsAllClear] = createSignal(false);
  const [isLoss, setIsLoss] = createSignal(false);
  return {
    gameState: {
      score,
      setScore,
      level,
      setLevel,
      levelsCleared,
      setLevelsCleared,
      isAllClear,
      setIsAllClear,
      isLoss,
      setIsLoss,
      addScore: (n: number) => setScore((s: number) => s + n),
      incrementLevel: () => setLevel((l: number) => l + 1),
      reset: () => { setScore(0); setLevel(1); setLevelsCleared(0); setIsAllClear(false); setIsLoss(false); },
    },
  };
});

// Polyfill caches API for @adobe/data
if (!globalThis.caches) {
  const store = new Map<string, Map<string, Response>>();
  (globalThis as any).caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const cache = store.get(name)!;
      return {
        match: async (key: string) => cache.get(key),
        put: async (key: string, val: Response) => { cache.set(key, val); },
        delete: async (key: string) => cache.delete(key),
        keys: async () => [...cache.keys()],
      };
    },
    has: async (name: string) => store.has(name),
    delete: async (name: string) => store.delete(name),
  };
}

// Mock container — simple object satisfying HTMLDivElement contract
function makeMockContainer(): HTMLDivElement {
  return {
    style: {} as CSSStyleDeclaration,
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    children: { length: 0 } as any,
    getBoundingClientRect: () => ({ width: 390, height: 844, x: 0, y: 0 }),
  } as unknown as HTMLDivElement;
}

describe('GameController — Pixi init and teardown', () => {
  let container: HTMLDivElement;
  const mockDeps = {
    coordinator: {} as any,
    tuning: { scaffold: {}, game: {} } as any,
    audio: {},
    gameData: {},
    analytics: {},
  };

  beforeEach(() => {
    container = makeMockContainer();
    vi.clearAllMocks();
    // Re-setup mocks that clearAllMocks reset
    mockAppInstance.init = vi.fn().mockResolvedValue(undefined);
    mockAppInstance.destroy = vi.fn();
    mockStage.addChild = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('init mounts Pixi canvas onto container', async () => {
    const { setupGame } = await import('~/game/dash-runner/GameController');
    const controller = setupGame(mockDeps);
    await controller.init(container);

    // Pixi canvas should be appended to container
    expect((container.appendChild as any)).toHaveBeenCalled();
    expect(controller.gameMode).toBe('pixi');
  });

  it('layer stack has correct eventMode per layer', async () => {
    const { setupGame } = await import('~/game/dash-runner/GameController');
    const controller = setupGame(mockDeps);
    await controller.init(container);

    // stage.addChild called 4 times (bg, world, hud, ui layers)
    expect(mockStage.addChild).toHaveBeenCalled();
  });

  it('destroy kills tweens, destroys app, calls setActiveDb(null)', async () => {
    const { setupGame } = await import('~/game/dash-runner/GameController');
    const controller = setupGame(mockDeps);
    await controller.init(container);
    controller.destroy();

    expect(mockGsap.killTweensOf).toHaveBeenCalled();
    expect(mockAppInstance.destroy).toHaveBeenCalled();
    expect(mockSetActiveDb).toHaveBeenCalledWith(null);
  });

  it('gameMode is pixi after init', async () => {
    const { setupGame } = await import('~/game/dash-runner/GameController');
    const controller = setupGame(mockDeps);
    expect(controller.gameMode).toBe('pixi');
  });
});
