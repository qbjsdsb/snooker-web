import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { cloneScene, LAB_SCENES } from '../lab/scenes.js';
import { SnookerRules } from '../rules/SnookerRules.js';
import { normalizeAngle } from '../input/aimMath.js';

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
    this.frames = 0;
    this.fpsClock = 0;
    this.cameraMode = 'aim';
    this.wasMoving = false;
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
    if (cue && point) {
      this.aimAngle = Math.atan2(point.z - cue.position.z, point.x - cue.position.x);
    }

    this.pull = 0;
    this.wasMoving = false;
    this.cameraMode = 'aim';
    this.renderer.setCameraMode('aim');
    this.renderer.syncBalls(this.world.balls);
    this.ui.onCamera?.('aim');
    this.ui.onSceneLoaded(scene);
  }

  resetScene() {
    this.loadScene(this.sceneId);
  }

  adjustAim(delta) {
    if (this.world.isMoving || !Number.isFinite(delta)) return;
    this.aimAngle = normalizeAngle(this.aimAngle + delta);
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

  setPull(v) {
    this.pull = Math.max(0, Math.min(1, v));
  }

  shoot() {
    if (this.world.isMoving) return false;
    const cue = this.world.cueBall;
    if (!cue) return false;

    const direction = { x: Math.cos(this.aimAngle), z: Math.sin(this.aimAngle) };
    const speed = 0.55 + (this.power / 100) ** 1.45 * 5.4;
    const ok = this.world.shootCue({
      direction,
      speed,
      topSpin: this.topSpin,
      sideSpin: this.sideSpin,
    });

    if (ok) {
      this.pull = 0;
      this.cameraMode = 'shot';
      this.renderer.beginShotView(cue, this.aimAngle);
      this.ui.onCamera?.('shot');
    }
    return ok;
  }

  setCamera(mode) {
    if (!['aim', 'tactical', 'top'].includes(mode)) return false;
    if (this.world.isMoving && mode === 'aim') return false;
    this.cameraMode = mode;
    this.renderer.setCameraMode(mode);
    this.ui.onCamera?.(mode);
    return true;
  }

  setMomentaryTop(active) {
    this.renderer.setMomentaryTop(active);
  }

  setStableCamera(value) {
    this.renderer.setStableCamera(value);
  }

  tick(now) {
    const rawDt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.accumulator += rawDt;

    while (this.accumulator >= FIXED_DT) {
      this.world.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    const moving = this.world.isMoving;
    if (this.wasMoving && !moving && this.cameraMode === 'shot') {
      this.renderer.endShotView();
      this.cameraMode = 'tactical';
      this.ui.onCamera?.('tactical');
    }
    this.wasMoving = moving;

    this.renderer.syncBalls(this.world.balls);
    this.renderer.setAim(this.world.cueBall, this.aimAngle, this.pull, !moving);
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

    this.frames += 1;
    this.fpsClock += dt;
    if (this.fpsClock >= 0.5) {
      const fps = Math.round(this.frames / this.fpsClock);
      this.renderer.reportFrameRate(fps);
      this.ui.onFps?.(fps);
      this.frames = 0;
      this.fpsClock = 0;
    }
  }
}
