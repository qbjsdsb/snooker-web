import { vec } from './vec2.js';

export class Ball {
  constructor({ id, kind, color, x, z, radius }) {
    this.id = id;
    this.kind = kind;
    this.color = color;
    this.radius = radius;
    this.position = vec(x, z);
    this.velocity = vec();
    this.forwardSpin = 0;
    this.sideSpin = 0;
    this.shotDirection = vec(1, 0);
    this.pocketed = false;
    this.sleepTimer = 0;
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  stop() {
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.forwardSpin = 0;
    this.sideSpin = 0;
    this.sleepTimer = 0;
  }
}
