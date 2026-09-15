# Snooker Lite

Snooker Lite is the simplified vertical-slice rebuild of this repository's web snooker project.

## Product goal

Keep the depth in the physics, not in the controls.

The first slice intentionally contains only:

- one cue ball;
- one red;
- one tuned corner pocket with physical jaws;
- fixed 2.5D orthographic camera;
- absolute pointer aiming;
- independent power control;
- optional cue-ball spin control;
- ghost-ball / object-ball-path aiming aid.

No networking, chat, replay, spectators, AI, multiple cue sports, free camera, or full snooker rules are included in this phase.

## Architecture

```text
lite/src/
├── physics/   pure deterministic physics modules
├── snooker/   snooker-only table geometry
├── game/      minimal game state / shot lifecycle
├── input/     mouse, touch and keyboard controls
└── render/    fixed Three.js presentation only
```

Physics modules do not import Three.js or DOM code.

## Physics model

The core is adapted from ideas and GPL-3.0 code in `tailuge/billiards` while being reorganized into a clean headless core. It includes:

- sliding → rolling → stationary motion states;
- cue strike producing linear and angular velocity;
- ball-ball restitution and tangential collision throw;
- spin-aware cushion impulses;
- fixed `1/512 s` physics steps;
- predictive ball-ball contact timing;
- separate pocket throat / jaw handling.

See `NOTICE.md` for provenance.

## Controls

- Move mouse over table: aim
- Touch-drag over table: aim
- Mouse wheel or power slider: power
- Cue-ball widget: top/back/left/right spin
- Click **击球** or press Space: shoot
- Left / Right arrows: fine aim
- Shift + Left / Right: extra-fine aim
- `R`: reset
- `G`: toggle guide

Add `?debug=1` to the URL to show physics diagnostics.

## Tests

```bash
node --test lite/tests/physics.test.mjs
```

The CI also syntax-checks all `.mjs` modules.
