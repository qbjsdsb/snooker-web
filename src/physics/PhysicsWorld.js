import { Ball } from './Ball.js';
import { clamp, dot, length, normalize } from './vec2.js';
import { TABLE } from '../config/table.js';
import { createCushionSegments, createJaws, createPockets } from './TableGeometry.js';

const RESTITUTION_BALL = 0.94;
const RESTITUTION_CUSHION = 0.78;
const ROLLING_DECEL = 0.19;
const SPIN_DECAY = 0.72;
const SLEEP_SPEED = 0.014;
const SLEEP_DELAY = 0.20;
const MAX_SPEED = 8.0;

export class PhysicsWorld {
  constructor() {
    this.balls = [];
    this.pockets = createPockets();
    this.cushions = createCushionSegments();
    this.jaws = createJaws();
    this.time = 0;
    this.events = [];
  }

  clear() {
    this.balls.length = 0;
    this.events.length = 0;
  }

  addBall(spec) {
    const ball = new Ball({ ...spec, radius: spec.radius ?? TABLE.ballRadius });
    this.balls.push(ball);
    return ball;
  }

  get cueBall() {
    return this.balls.find((b) => b.kind === 'cue' && !b.pocketed) ?? null;
  }

  get isMoving() {
    return this.balls.some((b) => !b.pocketed && b.speed > SLEEP_SPEED);
  }

  shootCue({ direction, speed, topSpin = 0, sideSpin = 0 }) {
    const cue = this.cueBall;
    if (!cue || this.isMoving) return false;
    const d = normalize(direction);
    const s = clamp(speed, 0.05, MAX_SPEED);
    cue.velocity.x = d.x * s;
    cue.velocity.z = d.z * s;
    cue.shotDirection.x = d.x;
    cue.shotDirection.z = d.z;
    cue.forwardSpin = clamp(topSpin, -1, 1) * s * 0.72;
    cue.sideSpin = clamp(sideSpin, -1, 1) * s * 0.42;
    cue.sleepTimer = 0;
    this.events.push({ type: 'cue-strike', speed: s });
    return true;
  }

  step(dt) {
    this.time += dt;
    this.events.length = 0;

    for (const ball of this.balls) {
      if (ball.pocketed) continue;
      this.#integrateBall(ball, dt);
      this.#collideCushions(ball);
      this.#collideJaws(ball);
      this.#checkPockets(ball);
    }

    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (b.pocketed) continue;
        this.#collideBalls(a, b);
      }
    }
  }

  #integrateBall(ball, dt) {
    const speed = ball.speed;
    if (speed < SLEEP_SPEED) {
      ball.sleepTimer += dt;
      if (ball.sleepTimer >= SLEEP_DELAY) ball.stop();
      return;
    }
    ball.sleepTimer = 0;

    const dir = normalize(ball.velocity);
    const spinAccel = ball.forwardSpin * 0.34;
    ball.velocity.x += dir.x * spinAccel * dt;
    ball.velocity.z += dir.z * spinAccel * dt;

    const newSpeed = ball.speed;
    const decel = Math.min(newSpeed, ROLLING_DECEL * dt);
    if (newSpeed > 0) {
      ball.velocity.x *= (newSpeed - decel) / newSpeed;
      ball.velocity.z *= (newSpeed - decel) / newSpeed;
    }

    ball.forwardSpin *= Math.exp(-SPIN_DECAY * dt);
    ball.sideSpin *= Math.exp(-0.50 * dt);

    ball.position.x += ball.velocity.x * dt;
    ball.position.z += ball.velocity.z * dt;
  }

  #collideBalls(a, b) {
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    const minDist = a.radius + b.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq) || minDist;
    const nx = dx / dist;
    const nz = dz / dist;
    const overlap = minDist - dist;

    a.position.x -= nx * overlap * 0.5;
    a.position.z -= nz * overlap * 0.5;
    b.position.x += nx * overlap * 0.5;
    b.position.z += nz * overlap * 0.5;

    const rvx = b.velocity.x - a.velocity.x;
    const rvz = b.velocity.z - a.velocity.z;
    const alongNormal = rvx * nx + rvz * nz;
    if (alongNormal > 0) return;

    const impulse = -(1 + RESTITUTION_BALL) * alongNormal / 2;
    a.velocity.x -= impulse * nx;
    a.velocity.z -= impulse * nz;
    b.velocity.x += impulse * nx;
    b.velocity.z += impulse * nz;

    for (const cue of [a, b]) {
      if (cue.kind !== 'cue') continue;
      const spinKick = cue.forwardSpin * 0.28;
      cue.velocity.x += cue.shotDirection.x * spinKick;
      cue.velocity.z += cue.shotDirection.z * spinKick;
      cue.forwardSpin *= 0.34;
    }

    this.events.push({ type: 'ball-hit', a: a.id, b: b.id, strength: Math.abs(alongNormal) });
  }

  #collideCushions(ball) {
    const r = ball.radius;
    for (const c of this.cushions) {
      if (c.axis === 'z') {
        if (ball.position.x < c.min || ball.position.x > c.max) continue;
        const penetration = c.inward > 0
          ? (c.value + r) - ball.position.z
          : ball.position.z - (c.value - r);
        const movingOut = c.inward > 0 ? ball.velocity.z < 0 : ball.velocity.z > 0;
        if (penetration > 0 && movingOut) {
          ball.position.z += penetration * c.inward;
          ball.velocity.z = -ball.velocity.z * RESTITUTION_CUSHION;
          ball.velocity.x += ball.sideSpin * 0.075 * c.inward;
          ball.sideSpin *= 0.62;
          this.events.push({ type: 'cushion-hit', ball: ball.id, strength: Math.abs(ball.velocity.z) });
        }
      } else {
        if (ball.position.z < c.min || ball.position.z > c.max) continue;
        const penetration = c.inward > 0
          ? (c.value + r) - ball.position.x
          : ball.position.x - (c.value - r);
        const movingOut = c.inward > 0 ? ball.velocity.x < 0 : ball.velocity.x > 0;
        if (penetration > 0 && movingOut) {
          ball.position.x += penetration * c.inward;
          ball.velocity.x = -ball.velocity.x * RESTITUTION_CUSHION;
          ball.velocity.z -= ball.sideSpin * 0.075 * c.inward;
          ball.sideSpin *= 0.62;
          this.events.push({ type: 'cushion-hit', ball: ball.id, strength: Math.abs(ball.velocity.x) });
        }
      }
    }
  }

  #collideJaws(ball) {
    for (const jaw of this.jaws) {
      const dx = ball.position.x - jaw.x;
      const dz = ball.position.z - jaw.z;
      const min = ball.radius + jaw.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || min;
      const nx = dx / d;
      const nz = dz / d;
      const overlap = min - d;
      ball.position.x += nx * overlap;
      ball.position.z += nz * overlap;
      const vn = dot(ball.velocity, { x: nx, z: nz });
      if (vn < 0) {
        ball.velocity.x -= (1 + 0.72) * vn * nx;
        ball.velocity.z -= (1 + 0.72) * vn * nz;
        ball.sideSpin *= 0.7;
        this.events.push({ type: 'jaw-hit', ball: ball.id, strength: Math.abs(vn) });
      }
    }
  }

  #checkPockets(ball) {
    for (const p of this.pockets) {
      const dx = ball.position.x - p.x;
      const dz = ball.position.z - p.z;
      const capture = p.radius * 0.82;
      if (dx * dx + dz * dz < capture * capture) {
        ball.pocketed = true;
        ball.stop();
        this.events.push({ type: 'pocket', ball: ball.id, pocket: p.id });
        return;
      }
    }

    if (Math.abs(ball.position.x) > 1.94 || Math.abs(ball.position.z) > 1.04) {
      let nearest = this.pockets[0];
      let best = Infinity;
      for (const p of this.pockets) {
        const dx = ball.position.x - p.x;
        const dz = ball.position.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) { best = d2; nearest = p; }
      }
      ball.pocketed = true;
      ball.stop();
      this.events.push({ type: 'pocket', ball: ball.id, pocket: nearest.id });
    }
  }

  getCueMotionState() {
    const cue = this.cueBall;
    if (!cue || cue.pocketed) return 'pocketed';
    const s = cue.speed;
    if (s < SLEEP_SPEED) return 'stationary';
    const excess = cue.forwardSpin;
    if (excess < -0.16) return 'draw / backspin';
    if (excess > 0.16) return 'follow / topspin';
    return s > 1.2 ? 'sliding' : 'rolling';
  }
}
