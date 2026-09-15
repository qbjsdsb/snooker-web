import { aimDeltaFromPixels, clampSensitivity } from './aimMath.js';

export class InputController {
  constructor({ renderer, game, stage }) {
    this.renderer = renderer;
    this.game = game;
    this.stage = stage;
    this.dragging = false;
    this.dragStart = null;
    this.dragPower = 0;
    this.pointerId = null;
    this.lastPointerX = null;
    this.sensitivity = 1;

    stage.addEventListener('pointerenter', (e) => { this.lastPointerX = e.clientX; });
    stage.addEventListener('pointerleave', () => { if (!this.dragging) this.lastPointerX = null; });
    stage.addEventListener('pointermove', (e) => this.#move(e));
    stage.addEventListener('pointerdown', (e) => this.#down(e));
    stage.addEventListener('pointerup', (e) => this.#up(e));
    stage.addEventListener('pointercancel', () => this.#cancel());
    stage.addEventListener('wheel', (e) => this.#wheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.#keyUp(e));
  }

  setSensitivity(value) {
    this.sensitivity = clampSensitivity(value);
    return this.sensitivity;
  }

  #move(e) {
    if (this.game.world.isMoving) {
      this.lastPointerX = e.clientX;
      return;
    }

    if (this.dragging) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      const px = Math.hypot(dx, dy);
      this.dragPower = Math.max(0, Math.min(1, px / 210));
      this.game.setPull(this.dragPower);
      return;
    }

    if (this.game.cameraMode !== 'aim' || e.pointerType === 'touch') {
      this.lastPointerX = e.clientX;
      return;
    }

    let dx = Number.isFinite(e.movementX) ? e.movementX : 0;
    if (!dx && this.lastPointerX !== null) dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;

    if (!Number.isFinite(dx) || Math.abs(dx) > 90) return;
    const delta = aimDeltaFromPixels(dx, this.sensitivity, e.shiftKey);
    this.game.adjustAim(delta);
  }

  #down(e) {
    if (this.game.world.isMoving) return;
    this.stage.focus({ preventScroll: true });
    this.lastPointerX = e.clientX;

    if (this.game.cameraMode !== 'aim') {
      this.game.setCamera('aim');
      return;
    }

    this.dragging = true;
    this.pointerId = e.pointerId;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragPower = 0;
    this.stage.setPointerCapture?.(e.pointerId);
  }

  #up(e) {
    if (!this.dragging) return;
    if (this.dragPower > 0.04) {
      this.game.setPower(Math.round(8 + this.dragPower * 92));
      this.game.shoot();
    }
    this.#cancel();
    this.stage.releasePointerCapture?.(e.pointerId);
  }

  #wheel(e) {
    if (this.game.world.isMoving) return;
    e.preventDefault();
    const step = Math.sign(e.deltaY) * -3;
    this.game.setPower(this.game.power + step);
  }

  #keyDown(e) {
    if (this.#isEditableTarget(e.target)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.game.setMomentaryTop(true);
      return;
    }

    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      this.game.setCamera('aim');
      return;
    }
    if (e.key === 't' || e.key === 'T' || e.key === 'Escape') {
      e.preventDefault();
      this.game.setCamera('tactical');
      return;
    }
    if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      this.game.setCamera('top');
      return;
    }

    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !this.game.world.isMoving) {
      e.preventDefault();
      if (this.game.cameraMode !== 'aim') this.game.setCamera('aim');
      const pixels = e.key === 'ArrowLeft' ? -9 : 9;
      this.game.adjustAim(aimDeltaFromPixels(pixels, this.sensitivity, e.shiftKey));
    }
  }

  #keyUp(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.game.setMomentaryTop(false);
    }
  }

  #isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  #cancel() {
    this.dragging = false;
    this.dragStart = null;
    this.dragPower = 0;
    this.pointerId = null;
    this.game.setPull(0);
  }
}
