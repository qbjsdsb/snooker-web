import * as THREE from 'three';
import { TABLE } from '../config/table.js';

const AIM_DISTANCE = 1.9;
const AIM_HEIGHT = 0.92;
const AIM_LOOK_AHEAD = 1.02;

export class CameraRig {
  constructor() {
    this.perspective = new THREE.PerspectiveCamera(36, 1, 0.05, 30);
    this.top = new THREE.OrthographicCamera(-2, 2, 1, -1, 0.05, 20);
    this.mode = 'aim';
    this.returnMode = 'aim';
    this.stable = true;
    this.cue = { x: 0, z: 0 };
    this.aimAngle = 0;
    this.shotPose = null;
    this._targetPosition = new THREE.Vector3();
    this._targetLook = new THREE.Vector3();
    this._currentLook = new THREE.Vector3();
    this._initialized = false;
    this._width = 1;
    this._height = 1;
  }

  get camera() {
    return this.mode === 'top' ? this.top : this.perspective;
  }

  setStable(value) {
    this.stable = Boolean(value);
  }

  setAimContext(cue, angle) {
    if (cue) {
      this.cue.x = cue.position.x;
      this.cue.z = cue.position.z;
    }
    if (Number.isFinite(angle)) this.aimAngle = angle;
  }

  setMode(mode) {
    if (!['aim', 'tactical', 'top', 'shot'].includes(mode)) return;
    const previous = this.mode;
    if (mode !== 'top' && mode !== 'shot') this.returnMode = mode;
    this.mode = mode;
    if (this.stable || previous === 'top' || mode === 'top') this._initialized = false;
  }

  setMomentaryTop(active) {
    if (active) {
      if (this.mode !== 'top') this.returnMode = this.mode === 'shot' ? 'tactical' : this.mode;
      this.mode = 'top';
    } else if (this.mode === 'top') {
      this.mode = this.returnMode || 'aim';
    }
    this._initialized = false;
  }

  beginShot(cue, angle) {
    if (!cue) return;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    this.shotPose = {
      position: new THREE.Vector3(cue.position.x - dx * 2.15, 1.34, cue.position.z - dz * 2.15),
      look: new THREE.Vector3(cue.position.x + dx * 1.2, 0.03, cue.position.z + dz * 1.2),
    };
    this.mode = 'shot';
    if (this.stable) this._initialized = false;
  }

  endShot() {
    this.shotPose = null;
    this.mode = 'tactical';
    this.returnMode = 'tactical';
    if (this.stable) this._initialized = false;
  }

  resize(width, height) {
    this._width = Math.max(1, width);
    this._height = Math.max(1, height);
    this.perspective.aspect = this._width / this._height;
    this.perspective.updateProjectionMatrix();

    const aspect = this._width / this._height;
    const tableWidth = TABLE.width + 0.48;
    const tableLength = TABLE.length + 0.48;
    let halfW;
    let halfH;
    if (aspect >= tableLength / tableWidth) {
      halfH = tableWidth / 2;
      halfW = halfH * aspect;
    } else {
      halfW = tableLength / 2;
      halfH = halfW / aspect;
    }
    this.top.left = -halfW;
    this.top.right = halfW;
    this.top.top = halfH;
    this.top.bottom = -halfH;
    this.top.updateProjectionMatrix();
  }

  update(dt) {
    if (this.mode === 'top') {
      this.top.position.set(0, 6.2, 0.001);
      this.top.up.set(0, 0, -1);
      this.top.lookAt(0, 0, 0);
      return;
    }

    this.perspective.up.set(0, 1, 0);
    this.#computePerspectivePose();

    const snap = this.stable || this.mode === 'aim' || !this._initialized;
    if (snap) {
      this.perspective.position.copy(this._targetPosition);
      this.perspective.lookAt(this._targetLook);
      this._currentLook.copy(this._targetLook);
      this._initialized = true;
      return;
    }

    const t = 1 - Math.exp(-Math.max(0, dt) * 9);
    this.perspective.position.lerp(this._targetPosition, t);
    this._currentLook.lerp(this._targetLook, t);
    this.perspective.lookAt(this._currentLook);
    this._initialized = true;
  }

  #setPerspectiveFov(fov) {
    if (Math.abs(this.perspective.fov - fov) < 0.001) return;
    this.perspective.fov = fov;
    this.perspective.updateProjectionMatrix();
  }

  #computePerspectivePose() {
    if (this.mode === 'shot' && this.shotPose) {
      this._targetPosition.copy(this.shotPose.position);
      this._targetLook.copy(this.shotPose.look);
      this.#setPerspectiveFov(38);
      return;
    }

    if (this.mode === 'tactical') {
      this._targetPosition.set(-0.08, 3.2, 3.35);
      this._targetLook.set(0.08, 0.02, 0);
      this.#setPerspectiveFov(40);
      return;
    }

    const dx = Math.cos(this.aimAngle);
    const dz = Math.sin(this.aimAngle);
    this._targetPosition.set(
      this.cue.x - dx * AIM_DISTANCE,
      AIM_HEIGHT,
      this.cue.z - dz * AIM_DISTANCE,
    );
    this._targetLook.set(
      this.cue.x + dx * AIM_LOOK_AHEAD,
      0.035,
      this.cue.z + dz * AIM_LOOK_AHEAD,
    );
    this.#setPerspectiveFov(34);
  }
}
