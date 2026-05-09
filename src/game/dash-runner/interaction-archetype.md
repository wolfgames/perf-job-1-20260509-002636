# Interaction Archetype — Dash Runner

## Interaction Type
**Tap** — single-point touch or mouse click on the game canvas

## Pointer Sequence
1. `pointerdown` on stage (not handled — we use `pointertap` for tap detection)
2. `pointertap` fires on stage when press+release in same location

## Input Gate
| Game Phase | Tap Result |
|------------|-----------|
| `idle` (grounded) | Jump impulse (-620 px/s) applied; phase → `airborne` |
| `airborne` | Runner wiggle (±4px x-oscillation, 150ms, 3 cycles); no jump |
| `won` | Ignored silently |
| `lost` | Ignored silently |
| `animating` | Ignored silently |

## Cancel Behavior
- No cancel action exists — tap is instantaneous
- Interrupted GSAP tweens are killed before any destroy call

## Invalid-Gesture Feedback
Airborne tap produces a **runner wiggle**: GSAP x-oscillation ±4px over 150ms (3 cycles, ease: none).
This communicates "tap received but blocked" without implying an error state or double-jump.

## Feel Description
- Tap → jump arc visible within one frame (~16ms)
- Landing: immediate snap (0ms, deterministic — no bounce)
- Win: runner white flash 100ms + screen fade 200ms
- Loss: runner continues falling 200ms + screen fade 200ms

## Technical Notes
- Single stage listener: `app.stage.on('pointertap', onTap)`
- `eventMode: 'static'` on `app.stage`
- `eventMode: 'passive'` on world-layer and ui-layer (propagates events to children)
- `touch-action: none` on canvas container (blocks browser pinch/swipe — mobile-constraints.mdc)
