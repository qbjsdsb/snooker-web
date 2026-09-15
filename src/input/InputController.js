export class InputController {
  constructor({ renderer, game, stage }) {
    this.renderer = renderer;
    this.game = game;
    this.stage = stage;
    this.dragging = false;
    this.dragStart = null;
    this.dragPower = 0;
    this.pointerId = null;

    stage.addEventListener('pointermove', (e) => this.#move(e));
    stage.addEventListener('pointerdown', (e) => this.#down(e));
    stage.addEventListener('pointerup', (e) => this.#up(e));
    stage.addEventListener('pointercancel', () => this.#cancel());
  }

  #move(e) {
    const point = this.renderer.screenToTable(e.clientX, e.clientY);
    if (!point || this.game.world.isMoving) return;
    const cue = this.game.world.cueBall;
    if (!cue) return;

    if (!this.dragging) {
      this.game.setAimToward(point);
      return;
    }

    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    const px = Math.hypot(dx, dy);
    this.dragPower = Math.max(0, Math.min(1, px / 210));
    this.game.setPull(this.dragPower);
  }

  #down(e) {
    if (this.game.world.isMoving) return;
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

  #cancel() {
    this.dragging = false;
    this.dragStart = null;
    this.dragPower = 0;
    this.game.setPull(0);
  }
}
