import assert from 'node:assert/strict';
import { PhysicsWorld } from '../src/physics/PhysicsWorld.js';
import { LAB_SCENES } from '../src/lab/scenes.js';

const dt = 1 / 240;

function runScene(id, duration = 5) {
  const scene = LAB_SCENES.find((s) => s.id === id);
  const world = new PhysicsWorld();
  scene.balls.forEach((ball) => world.addBall({ ...ball }));
  const cue = world.cueBall;
  let point = scene.aimPoint;
  if (!point && scene.aimAt) point = world.balls.find((b) => b.id === scene.aimAt)?.position;
  const angle = Math.atan2(point.z - cue.position.z, point.x - cue.position.x);
  const speed = 0.55 + (scene.power / 100) ** 1.45 * 5.4;
  world.shootCue({
    direction: { x: Math.cos(angle), z: Math.sin(angle) },
    speed,
    topSpin: scene.spin.top,
    sideSpin: scene.spin.side,
  });

  let cueHit = null;
  let cueXHalfSecondAfterHit = null;
  const events = [];
  for (let i = 0; i < duration / dt; i++) {
    world.step(dt);
    for (const e of world.events) events.push({ ...e, t: i * dt });
    if (!cueHit && world.events.some((e) => e.type === 'ball-hit' && (e.a === 'cue' || e.b === 'cue'))) {
      cueHit = { t: i * dt, x: cue.position.x };
    }
    if (cueHit && cueXHalfSecondAfterHit === null && i * dt - cueHit.t >= 0.5) {
      cueXHalfSecondAfterHit = cue.position.x;
    }
  }
  return { scene, world, cue, cueHit, cueXHalfSecondAfterHit, events };
}

const stun = runScene('stun');
assert.ok(stun.cueHit, 'stun scene should hit the object ball');
assert.ok(Math.abs(stun.cueXHalfSecondAfterHit - stun.cueHit.x) < 0.05, 'stun should leave cue ball close to collision point after 0.5s');

const follow = runScene('follow');
assert.ok(follow.cueHit, 'follow scene should hit the object ball');
assert.ok(follow.cueXHalfSecondAfterHit > follow.cueHit.x + 0.10, 'topspin should carry cue ball forward after collision');

const draw = runScene('draw');
assert.ok(draw.cueHit, 'draw scene should hit the object ball');
assert.ok(draw.cueXHalfSecondAfterHit < draw.cueHit.x - 0.08, 'backspin should pull cue ball backward after collision');

const cushion = runScene('cushion');
assert.ok(cushion.events.some((e) => e.type === 'cushion-hit' || e.type === 'jaw-hit'), 'cushion scene should contact a cushion or jaw');

const pocket = runScene('pocket');
assert.ok(pocket.events.some((e) => e.type === 'pocket' && e.ball === 'red-1'), 'pocket scene should pot the red ball');

console.log('Physics smoke tests passed: stun / follow / draw / cushion / pocket');
