# Dash Runner
**Tagline:** Every leap tells you how far you've come.
**Genre:** Platformer / Auto-Runner
**Platform:** Mobile first (portrait, touch), playable on web
**Target Audience:** Casual adults 30+

---

## Table of Contents

**The Game**
1. [Game Overview](#game-overview)
2. [At a Glance](#at-a-glance)

**How It Plays**
3. [Core Mechanics](#core-mechanics)
4. [Level Generation](#level-generation)

**How It Flows**
5. [Game Flow](#game-flow)

---

## Game Overview

Dash Runner is a minimal auto-running platformer built for performance benchmarking. The player's character runs automatically across a scrolling platform world; a single tap makes the runner jump, chaining leaps across gaps and over obstacles. Each level is a short, self-contained course that ends when the runner crosses the finish line or falls into a pit.

**Setting:** A stripped-down neon grid world — sparse geometry, flat colors, and deliberate visual minimalism that keeps the GPU workload measurable and the frame budget tight.

**Core Loop:** Player taps to jump over gaps and obstacles -> successful jumps advance the runner to the finish line -> crossing the finish line completes the level and unlocks the next.

---

## At a Glance

| | |
|---|---|
| **Play Surface** | Scrolling horizontal corridor, portrait viewport |
| **Input** | Single tap (jump) |
| **Runner Speed** | Constant per level (scales with level number) |
| **Obstacles** | Gaps, low barriers |
| **Session Target** | 1-3 min per level |
| **Levels at Launch** | 10 procedurally generated |
| **Failure** | Yes — falling into a gap restarts the level |
| **Continue System** | Instant free retry (no cost, no ad gate) |
| **Difficulty Scaling** | Gap frequency and width increase with level number |
| **Generation Method** | Procedural (seeded) |

---

## Core Mechanics

### Primary Input

**Input type:** Single tap anywhere on the screen.
**Acts on:** The player-controlled runner character.
**Produces:** An upward jump arc. If the runner is not grounded, the tap is ignored (no double-jump).

Touch event: `pointertap`. Mouse click maps to the same handler. No hover-dependent mechanics. No keyboard input required for gameplay.

### Play Surface

- **Orientation:** Portrait (9:16). The visible corridor is approximately 360 × 640 logical pixels on a reference device.
- **Scroll direction:** Horizontal, right-to-left relative to the runner. The runner is pinned at 25% from the left edge; the world scrolls under it.
- **Platform height:** Platforms occupy the bottom 30% of the viewport. The runner runs on the top surface.
- **Camera:** No vertical camera movement. The play field is single-height.

### Game Entities

#### Runner (Player Character)
- **Visual:** A flat colored rectangle (32 × 48 px visual size; 44 × 56 pt tap target extends around it, unused since tap is screen-wide).
- **Behavior:** Moves rightward at a constant horizontal speed set by the level. Affected by gravity when airborne.
- **Edge cases:**
  - IF the runner's bottom edge falls below the platform surface, THEN the level is lost.
  - IF the runner reaches the right edge of the level layout, THEN the level is won.

#### Platform Tile
- **Visual:** A flat solid rectangle, 64 × 24 px. Uses atlas sprite `scene-platform`.
- **Behavior:** Static. Provides a collision surface for the runner's feet.
- **Edge cases:**
  - IF the runner overlaps the top surface of a tile AND runner is moving downward, THEN runner is set grounded (velocity-y = 0, position snapped to tile top).
  - Tiles never move or change state.

#### Gap
- **Visual:** Absence of tiles — empty space between platform segments.
- **Behavior:** No collision. The runner falls through.
- **Edge cases:**
  - IF the runner enters a gap and its bottom falls below the kill plane, THEN loss is triggered immediately.

#### Barrier (Low Obstacle)
- **Visual:** A flat solid rectangle, 32 × 32 px, sitting on top of a platform tile. Uses atlas sprite `scene-barrier`.
- **Behavior:** Solid. Blocks the runner's path if not jumped over.
- **Edge cases:**
  - IF the runner collides with the side face of a barrier, THEN the runner stops and loses the level (no sliding around).
  - Barriers only appear on solid platform stretches (never overhanging gaps).

#### Finish Line
- **Visual:** A vertical stripe, 8 × 96 px, bright accent color. Uses atlas sprite `scene-finish`.
- **Behavior:** Trigger zone. When the runner overlaps it, the level is won.

### Movement & Physics Rules

All durations are in milliseconds.

**Gravity:**
- IF the runner is airborne, THEN apply downward acceleration of 1800 px/s² each frame.

**Jump:**
- IF the player taps AND the runner is grounded, THEN apply an upward impulse of −620 px/s to runner velocity-y.
- Jump rise time: approximately 320 ms. Jump total air time: approximately 640 ms.
- IF the player taps AND the runner is NOT grounded, THEN ignore the tap.

**Landing:**
- IF the runner's bottom edge reaches a platform tile top surface during a downward trajectory, THEN set velocity-y = 0 and mark runner as grounded.
- Landing snap duration: 0 ms (immediate, no bounce animation — keeps physics deterministic for performance testing).

**Runner speed:**
- Constant horizontal speed per level. Level 1: 180 px/s. Each subsequent level adds 15 px/s (capped at 300 px/s after level 9).

**Input during animation:**
- Tap input is always read. The only rejection condition is "not grounded" (documented above).

> For invalid action feedback (visual, audio, duration), see [Feedback & Juice](#feedback--juice).

---

## Level Generation

### Method

Procedural — all 10 levels are generated at runtime from a numeric seed. No hand-crafted levels. Same seed always produces the same level layout.

### Generation Algorithm

**Step 1: Seed Initialization**
- Inputs: `levelNumber` (1-10)
- Outputs: A seeded pseudo-random number generator (LCG or mulberry32)
- Constraints: Seed formula = `levelNumber * 48271`. Same level number always yields the same RNG sequence.

**Step 2: Platform Segment Layout**
- Inputs: RNG, `levelNumber`, level length budget (see Step 5)
- Outputs: Array of platform segment objects `{ startX, length, hasBarrier }`
- Constraints:
  - Platform segment length: 2-8 tiles (128-512 px), drawn from RNG.
  - Gap width between segments: 1-3 tiles (64-192 px), drawn from RNG.
  - First platform segment always starts at x=0 and is at least 5 tiles long (safe spawn zone).
  - Last platform segment always ends with the finish line and is at least 3 tiles long (safe landing zone).
  - IF `levelNumber` <= 2, THEN max gap width is 1 tile and no barriers are placed.
  - IF `levelNumber` >= 3, THEN barriers may appear on platform segments. Barrier chance = `(levelNumber - 2) * 8%`, max 40%.

**Step 3: Barrier Placement**
- Inputs: RNG, platform segment list, `levelNumber`
- Outputs: Barrier position list (one barrier per eligible segment at most)
- Constraints:
  - IF a segment is eligible for a barrier (Step 2 rule), draw from RNG to place or skip.
  - Barrier is placed at least 2 tiles from the start and 2 tiles from the end of its segment (ensures approach run-up).
  - Never two barriers on the same segment.

**Step 4: Solvability Check**
- Inputs: Segment layout, barrier positions, runner jump arc
- Outputs: Pass / Fail
- Constraints:
  - Maximum jumpable gap at level speed must be <= runner's maximum horizontal jump distance.
  - Maximum jump distance = `runnerSpeed * jumpAirTime` (varies by level; always computed, not hardcoded).
  - IF any gap exceeds this distance, THEN reject the layout and retry.

**Step 5: Level Length Budget**
- Inputs: `levelNumber`
- Outputs: Total level length in tiles
- Constraints:
  - Level length = `20 + (levelNumber * 5)` tiles. Level 1 = 25 tiles; Level 10 = 70 tiles.
  - Ensures 1-3 minute session target at the per-level runner speed.

### Seeding & Reproducibility

- Seed formula: `seed = levelNumber * 48271`
- The same seed always produces the same RNG sequence and therefore the same level.
- If the player retries a level, the same seed is reused — the layout is identical on retry.
- RNG is a pure function (no global state mutation between levels).

### Solvability Validation

**Rejection conditions (any one triggers a retry):**
1. A gap is wider than the runner's maximum jump distance at the current level speed.
2. The total layout length falls outside ±10% of the level length budget.
3. Two barriers are placed adjacent (no run-up space between them).

**Retry logic:**
- On rejection, increment the seed offset by 1 (`seed + attempt`) and regenerate from Step 1.
- Maximum retry attempts: 20.

**Fallback chain:**
- IF 20 retries exhausted, THEN use the guaranteed safe layout (see below).

**Last-resort guarantee:**
- A hard-coded minimal layout: one long platform (full level length, no gaps, no barriers). Always valid. Never rejected. The finish line is placed at the far end.
- This layout is boring but guaranteed completable. It only appears if generation fails 20 times (extremely unlikely in practice).

### Hand-Crafted Levels

None. All 10 levels are procedurally generated.

---

## Game Flow

### Master Flow Diagram

```
App Open
  |
  v [assets loaded]
Title Screen (TITLE)
  |
  v [Tap "Play"]
Gameplay Screen (PLAY)
  |--- [runner reaches finish line] ---> Level Complete Screen (OUTCOME)
  |--- [runner falls into gap]      ---> Loss Screen (OUTCOME)

Level Complete Screen
  |--- [Tap "Next Level"] ---> Gameplay Screen (next level) (PLAY)
  |--- [All 10 levels done] --> Results Screen (OUTCOME)

Loss Screen
  |--- [Tap "Retry"] ---> Gameplay Screen (same level, same seed) (PLAY)

Results Screen
  |--- [Tap "Play Again"] ---> Gameplay Screen (level 1) (PLAY)
```

### Screen Breakdown

#### Title Screen
- **lifecycle_phase:** TITLE
- **Purpose:** Entry point. Presents the game name and starts play.
- **Player sees:** Game title "Dash Runner", a large "Play" button, brief one-line instruction ("Tap to jump").
- **Player does:** Taps "Play".
- **What happens next:** Transition to Gameplay Screen, Level 1.
- **Expected time on screen:** < 10 seconds.

#### Gameplay Screen
- **lifecycle_phase:** PLAY
- **Purpose:** The core game. Player taps to jump, runner auto-runs.
- **Player sees:** Scrolling platform world, the runner character, a level number indicator (top-left), and a minimal progress bar (top) showing distance to finish.
- **Player does:** Taps the screen to jump at the right moment.
- **What happens next:** Win state (reach finish) or Loss state (fall into gap).
- **Expected time on screen:** 1-3 minutes per level.

#### Level Complete Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** Celebrate completing a level. Advance to next.
- **Player sees:** "Level [N] Complete!" text, a "Next Level" button (if levels remain) or "See Results" button (if final level done).
- **Player does:** Taps the button.
- **What happens next:** Gameplay Screen (next level) or Results Screen.
- **Expected time on screen:** < 15 seconds.

#### Loss Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** Acknowledge failure gently. Offer instant free retry.
- **Player sees:** "Try Again?" text (never "Game Over"), level number, a "Retry" button.
- **Player does:** Taps "Retry".
- **What happens next:** Gameplay Screen restarts the same level with the same seed.
- **Expected time on screen:** < 10 seconds.
- **Tone note:** Friendly. No penalty, no countdown, no ad gate. Instant retry.

#### Results Screen
- **lifecycle_phase:** OUTCOME
- **Purpose:** End-of-game summary after all 10 levels are cleared.
- **Player sees:** "You finished!" text, total levels cleared, a "Play Again" button.
- **Player does:** Taps "Play Again".
- **What happens next:** Returns to Gameplay Screen at Level 1.
- **Expected time on screen:** < 20 seconds.

### Board States

| State | Description | Input Accepted |
|-------|-------------|----------------|
| Idle | Runner is grounded, world is scrolling | Yes — tap to jump |
| Airborne | Runner is in jump arc | No — tap ignored |
| Animating | Win/loss animation playing | No |
| Won | Finish line triggered, outcome screen loading | No |
| Lost | Kill plane triggered, outcome screen loading | No |

Any transition between states that changes visible element positions (runner, scrolling world) is animated — no instant position teleports. State transitions:

- **Idle → Airborne:** Triggered by tap. Runner position is animated upward via physics integration each frame (GSAP ticker). Duration: up to ~640 ms (full arc).
- **Airborne → Idle:** Triggered by landing on platform. Runner snaps to platform top (0 ms snap, physics-driven).
- **Idle/Airborne → Lost:** Triggered by falling below kill plane. Runner continues falling for 200 ms (brief fall-off animation), then screen fades to black (200 ms fade) before Loss Screen appears.
- **Idle → Won:** Triggered by overlap with finish line. Runner flashes white (100 ms), screen fades to black (200 ms) before Level Complete Screen appears.

### Win Condition

IF `runner.x >= finishLine.x` THEN level is won.

### Lose Condition

IF `runner.y > killPlane.y` (where `killPlane.y` = platform surface + 200 px below viewport bottom) THEN level is lost.

### Win Sequence (ordered)

1. Overlap between runner bounds and finish line trigger zone detected.
2. Board state → Won (input disabled).
3. Runner sprite flashes white tint (100 ms, GSAP tween).
4. Screen fades to black (200 ms, GSAP tween on overlay).
5. Level Complete Screen renders.
6. Fade-in from black (150 ms).

### Loss Sequence (ordered)

1. Runner bottom edge crosses kill plane.
2. Board state → Lost (input disabled).
3. Runner continues falling off-screen for 200 ms (physics continues, no intervention).
4. Screen fades to black (200 ms, GSAP tween on overlay).
5. Loss Screen renders.
6. Fade-in from black (150 ms).
