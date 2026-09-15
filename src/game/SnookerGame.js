import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { cloneScene, LAB_SCENES } from '../lab/scenes.js';
import { SnookerRules } from '../rules/SnookerRules.js';

const FIXED_DT = 1 / 240;

export class SnookerGame {
  constructor({ renderer, ui }) {
    this.renderer = renderer;
    this.ui = ui;
    this.world = new PhysicsWorld();
    this.rules = new SnookerRules();
    this.sceneId = LAB_SCENES[0].id;
    this.aimAngle = 0;
    this.power = 42;
    this.topSpin = 0;
    this.sideSpin = 0;
    this.pull = 0;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.running = true;
    this.frames = 0;
    this.fpsClock = 0;
    this.loadScene(this.sceneId);
  }

  loadScene(id) {
    const scene = cloneScene(LAB_SCENES.find((x) => x.id === id) ?? LAB_SCENES[0]);
    this.sceneId = scene.id;
    this.world.clear();
    scene.balls.forEach((ball) => this.world.addBall(ball));
    this.setPower(scene.power);
    this.setSpin(scene.spin.top, scene.spin.side);

    const cue = this.world.cueBall;
    let point = scene.aimPoint;
    if (!point && scene.aimAt) {
      const target = this.world.balls.find((x) => x.id === scene.aimAt);
      if (target) point = target.position;
    }
    if (cue && point) this.aimAngle = Math.atan2(point.z - cue.position.z, point.x - cue.position.x);
    this.pull = 0;
    this.renderer.syncBalls(this.world.balls);
    this.ui.onSceneLoaded(scene);
  }

  resetScene() { this.loadScene(this.sceneId); }

  setAimToward(point) {
    const cue = this.world.cueBall;
    if (!cue || this.world.isMoving) return;
    this.aimAngle = Math.atan2(point.z - cue.position.z, point.x - cue.position.x);
  }

  setPower(value) {
    this.power = Math.max(5, Math.min(100, Number(value) || 5));
    this.ui.onPower?.(this.power);
  }

  setSpin(top, side) {
    this.topSpin = Math.max(-1, Math.min(1, top));
    this.sideSpin = Math.max(-1, Math.min(1, side));
    this.ui.onSpin?.(this.topSpin, this.sideSpin);
  }

  setPull(v) { this.pull = Math.max(0, Math.min(1, v)); }

  shoot() {
    if (this.world.isMoving) return false;
    const direction = { x: Math.cos(this.aimAngle), z: Math.sin(this.aimAngle) };
    const speed = 0.55 + (this.power / 100) ** 1.45 * 5.4;
    const ok = this.world.shootCue({
      direction,
      speed,
      topSpin: this.topSpin,
      sideSpin: this.sideSpin,
    });
    if (ok) this.pull = 0;
    return ok;
  }

  setCamera(mode) { this.renderer.setCameraMode(mode); }

  tick(now) {
    const rawDt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.accumulator += rawDt;
    while (this.accumulator >= FIXED_DT) {
      this.world.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.renderer.syncBalls(this.world.balls);
    this.renderer.setAim(this.world.cueBall, this.aimAngle, this.pull, !this.world.isMoving);
    this.renderer.render(rawDt);
    this.#updateUi(rawDt);
  }

  #updateUi(dt) {
    const cue = this.world.cueBall;
    this.ui.onMetrics?.({
      speed: cue?.speed ?? 0,
      motion: this.world.getCueMotionState(),
      moving: this.world.isMoving,
    });
    this.frames++;
    this.fpsClock += dt;
    if (this.fpsClock >= 0.5) {
      this.ui.onFps?.(Math.round(this.frames / this.fpsClock));
      this.frames = 0;
      this.fpsClock = 0;
    }
  }
}
