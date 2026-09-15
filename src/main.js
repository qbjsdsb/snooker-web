import { SceneRenderer } from './rendering/SceneRenderer.js';
import { SnookerGame } from './game/SnookerGame.js';
import { InputController } from './input/InputController.js';
import { LAB_SCENES } from './lab/scenes.js';

const stage = document.querySelector('#stage');
const physicsStatus = document.querySelector('#physicsStatus');
const fpsLabel = document.querySelector('#fpsLabel');
const powerRange = document.querySelector('#powerRange');
const powerText = document.querySelector('#powerText');
const shootButton = document.querySelector('#shootButton');
const resetScene = document.querySelector('#resetScene');
const sceneButtons = document.querySelector('#sceneButtons');
const spinPad = document.querySelector('#spinPad');
const spinDot = document.querySelector('#spinDot');
const topSpinText = document.querySelector('#topSpinText');
const sideSpinText = document.querySelector('#sideSpinText');
const resetSpin = document.querySelector('#resetSpin');
const cameraButtons = document.querySelector('#cameraButtons');
const speedMetric = document.querySelector('#speedMetric');
const motionMetric = document.querySelector('#motionMetric');
const hint = document.querySelector('#hint');

const renderer = new SceneRenderer(stage);
let game;

const ui = {
  onPower(value) {
    powerRange.value = String(Math.round(value));
    powerText.textContent = `${Math.round(value)}%`;
  },
  onSpin(top, side) {
    topSpinText.textContent = top.toFixed(2);
    sideSpinText.textContent = side.toFixed(2);
    const x = side * 34;
    const y = -top * 34;
    spinDot.style.transform = `translate(${x}px, ${y}px)`;
  },
  onSceneLoaded(scene) {
    for (const button of sceneButtons.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.scene === scene.id);
    }
    hint.textContent = scene.description;
  },
  onMetrics({ speed, motion, moving }) {
    speedMetric.textContent = `${speed.toFixed(2)} m/s`;
    motionMetric.textContent = motion;
    physicsStatus.textContent = moving ? '运动中' : '静止';
    physicsStatus.style.color = moving ? '#f0ddb7' : '';
    shootButton.disabled = moving;
  },
  onFps(fps) { fpsLabel.textContent = `${fps} fps`; }
};

game = new SnookerGame({ renderer, ui });
new InputController({ renderer, game, stage });

for (const scene of LAB_SCENES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.scene = scene.id;
  button.textContent = scene.name;
  button.addEventListener('click', () => game.loadScene(scene.id));
  sceneButtons.appendChild(button);
}
ui.onSceneLoaded(LAB_SCENES[0]);

powerRange.addEventListener('input', () => game.setPower(powerRange.value));
shootButton.addEventListener('click', () => game.shoot());
resetScene.addEventListener('click', () => game.resetScene());
resetSpin.addEventListener('click', () => game.setSpin(0, 0));

function updateSpinFromPointer(e) {
  const rect = spinPad.getBoundingClientRect();
  let x = (e.clientX - (rect.left + rect.width/2)) / (rect.width * 0.36);
  let y = (e.clientY - (rect.top + rect.height/2)) / (rect.height * 0.36);
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  game.setSpin(-y, x);
}
spinPad.addEventListener('pointerdown', (e) => {
  spinPad.setPointerCapture?.(e.pointerId);
  updateSpinFromPointer(e);
});
spinPad.addEventListener('pointermove', (e) => {
  if (spinPad.hasPointerCapture?.(e.pointerId)) updateSpinFromPointer(e);
});

cameraButtons.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-camera]');
  if (!button) return;
  for (const b of cameraButtons.querySelectorAll('button')) b.classList.toggle('active', b === button);
  game.setCamera(button.dataset.camera);
});

let animationId = 0;
function frame(now) {
  game.tick(now);
  animationId = requestAnimationFrame(frame);
}
animationId = requestAnimationFrame(frame);
window.addEventListener('pagehide', () => cancelAnimationFrame(animationId), { once: true });
