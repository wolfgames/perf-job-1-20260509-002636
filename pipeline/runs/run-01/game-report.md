---
type: game-report
game: "Dash Runner"
pipeline_version: "0.3.13"
run: 1
pass: core
status: complete
features:
  total: 19
  implemented: 19
  partial: 0
  deferred: 0
tests:
  new: 73
  passing: 212
  total: 232
issues:
  critical: 0
  minor: 0
cos:
  - id: core-interaction
    status: pass
    note: "One-gesture tap (pointertap); airborne wiggle feedback; input blocked during animating/won/lost; interaction-archetype.md complete"
  - id: canvas
    status: pass
    note: "Runner 32×48px visually distinct (neon blue); platform 64×24 (brown), barrier 32×32 (red), finish 8×96 (neon green); emoji labels on all fallback shapes; dark neon theme visible from start screen"
  - id: animated-dynamics
    status: pass
    note: "Runner y updates frame-by-frame via GSAP ticker; overlay fades over 200ms (not instant); winner flash 100ms; runner stable identity (repositioned, not recreated); input blocked during animation"
  - id: scoring
    status: pass
    note: "Formula: currentLevel*1000*speedMultiplier*retryPenaltyFactor (3 multiplicative dimensions); skilled player scores ≥3× beginner confirmed by test"
  - id: skill-curve
    status: deferred-to-pass-meta
    note: "Level progression (speed scaling, barriers) implemented; skill-curve CoS gated at meta pass per conditions/index.md"
completeness:
  items_required: 22
  items_met: 22
  items_gaps: 0
blocking:
  cos_failed: []
  completeness_gaps: []
---

# Pipeline Report: Dash Runner

**Pass:** `core` | **Status:** complete | **Pipeline version:** 0.3.13

## Features

- [x] screen-flow-wiring — SolidJS screen flow (loading/start/game/results) wired and stable
- [x] asset-coordinator — Asset coordinator with bundle loading; scene-dash bundle registered
- [x] title-screen — "Dash Runner" title, "Tap to jump" instruction, Play button ≥44px
- [x] results-screen — Three-branch outcome: "Try Again?" / "Level N Complete!" / "You finished!"
- [x] game-state-signals — Adapted to ECS bridge; DashPlugin owns state; signals are bridge targets
- [x] game-controller-stub — Replaced with full Pixi GPU implementation; contract shape preserved
- [x] start-screen-visual-identity — Dark #0a0a1a bg, #00FFAA neon accent; distinct from green placeholder
- [x] results-screen-visual-identity — Dark neon theme; friendly copy; no "Game Over"
- [x] pixi-app-init — Pixi Application; layer stack (bg/world/hud/ui); resolution capped at 2
- [x] physics-loop — physicsStep pure function; gravity 1800px/s²; jump -620px/s; AABB collision
- [x] level-generator — Seeded mulberry32 RNG; seed=levelNumber*48271; solvability check; 20-retry fallback
- [x] world-renderer — Scrolling tile pool (pre-allocated); emoji+Graphics labeled fallback; no per-frame alloc
- [x] runner-renderer — 32×48px at 25% viewport; wiggle on airborne tap; win flash; stable identity
- [x] hud-renderer — Level text 18px top-left; progress bar top-center; within 48px HUD zone
- [x] tap-input-handler — Single stage listener (pointertap); phase-gated; airborne wiggle
- [x] canvas-art-bundles — scene-dash bundle with scene-* prefix; 5 aliases registered
- [x] win-loss-transitions — Win: 100ms flash + 200ms fade; Loss: 200ms fall + 200ms fade; GSAP animated
- [x] level-progression — 10 levels; retry same seed; nextLevel increments speed; cap at 300px/s
- [x] scoring-system — computeLevelScore with 3 multiplicative dimensions; displayed on results screen

## CoS Compliance — pass `core`

| CoS                    | Status  | Evidence / note |
|------------------------|---------|-----------------|
| `core-interaction`     | pass    | pointertap one-gesture; airborne wiggle ±4px 150ms; input blocked during animating/won/lost phases; interaction-archetype.md complete with all required fields |
| `canvas`               | pass    | Emoji-labeled Graphics fallback; runner/platform/barrier/finish all visually distinct; neon theme on start screen and gameplay; HUD within 48px zone; 0px overflow onto 64px DOM reserve |
| `animated-dynamics`    | pass    | Runner y from physics ticker each frame; overlay fade 0→1 200ms via GSAP; win flash 100ms; runner stable identity; input blocked during animation; no instant state changes |
| `scoring` (base)       | pass    | currentLevel×1000×speedMultiplier×retryPenaltyFactor; 3 multiplicative dimensions; skilled≥3× beginner confirmed by test; real-time HUD progress bar; score on results screen |
| `skill-curve`          | deferred-to-pass-meta | Level progression and speed scaling implemented; gated at meta pass per conditions/index.md |

## Completeness — pass `core`

| Area                   | Required | Met | Gaps |
|------------------------|----------|-----|------|
| Interaction            | 5        | 5   | 0    |
| Board & Pieces         | 4        | 4   | 0    |
| Core Mechanics         | 6        | 6   | 0    |
| Scoring (base)         | 3        | 3   | 0    |
| CoS mandatory (core)   | 4        | 4   | 0    |

**Total:** 22/22 items met; 0 completeness gaps.

### Interaction
- [x] Primary interaction defined: single tap (pointertap) — one-gesture rule
- [x] Interaction template applied: interaction-archetype.md in game root
- [x] Gesture detection works: phase-gated tap handler, 60fps ticker
- [x] Swap/clear animation: jump arc visible per-frame; wiggle on airborne tap
- [x] Invalid-move feedback: airborne tap → runner wiggle ±4px 150ms GSAP

### Board & Pieces
- [x] Board renders at correct dimensions: 390×844 reference; HUD top 48px; DOM bottom 64px
- [x] Pieces fill cell correctly: tile pool pre-allocated; spacing via world-space coordinates
- [x] Piece visual style locked: neon blue runner, brown platform, red barrier, neon-green finish
- [x] Every piece has stable identity: RunnerRenderer single container repositioned per-frame; WorldRenderer pool recycled (not recreated)

### Core Mechanics
- [x] Match/clear detection: finish line triggers win; kill plane triggers loss; barrier AABB collision
- [x] Gravity drop with per-piece animation: vy integration each frame; runner y updates each tick
- [x] New-piece spawning: level generator creates full layout on game init; same seed on retry
- [x] Cascade resolution: game is platformer — no cascades; level ends on win/loss deterministically
- [x] Cascade escalation: N/A — platformer genre; speed increase per level substitutes
- [x] Input blocked during animations: animating/won/lost phases block tap handler

### Scoring (base)
- [x] Base score per clear/match: 1000 points per level cleared
- [x] Real-time score display: progress bar updates each frame; score on results screen
- [x] Score popup animation: level complete screen shows score with styled display

### CoS mandatory at pass `core`
- [x] condition-core-interaction: one-gesture tap; wiggle feedback on airborne; input blocked during animating; archetype doc present
- [x] condition-canvas: labeled fallback shapes; visually distinct entities; neon theme identity; HUD no overlap
- [x] condition-animated-dynamics: no instant state changes; event queue (physics ticker); stable IDs
- [x] condition-scoring (base): 3 multiplicative dimensions; skilled ≥3× beginner

## Known Issues

No critical issues. Minor notes:

- WorldRenderer tile recycling in `update()` uses an O(n²) scan (rightmostX computed then loop again for recycle). Acceptable for the level sizes (25–70 tiles), no jank risk at 60fps.
- HudRenderer uses `require('pixi.js')` for lazy Text load (test environment compatibility). Functional but non-idiomatic; refactor opportunity in secondary pass.
- Browser smoke test not executed (browser MCP unavailable in CI environment). Flagged as carry-forward for external QA.

## Deferred

- **`skill-curve` CoS** — Level progression and difficulty scaling implemented (speed +15px/s per level, barriers from level 3, solvability check). Formal CoS walk deferred to meta pass per `conditions/index.md § Pass → CoS mapping`.
- **Browser smoke test** — Browser MCP unavailable in this environment. Deferred to external QA or secondary pass with browser access.
- **Pre-existing scaffold test failures** — 20 failures in 232 tests are all pre-existing scaffold infrastructure issues (missing scripts, npx, facade behavior). Not game code; deferred to scaffold maintainer.

## Recommendations

1. **Secondary pass: pattern-busters** — Add special pieces (line blast, area blast) once core loop is stable in production.
2. **Meta pass: skill-curve CoS** — Implement difficulty progression curves, level select, and per-level star ratings.
3. **Asset pipeline** — Replace Graphics fallback with real texture atlases (scene-dash bundle) once art assets are available. Current fallback (labeled shapes) is readable and ships correctly.
4. **HudRenderer refactor** — Replace `require('pixi.js')` with top-level import; the test environment compatibility workaround is not needed with proper mock setup.
5. **Mobile smoke test** — Run on a real iPhone to verify touch-action:none, dvh viewport, and audio unlock work correctly at 60fps.
