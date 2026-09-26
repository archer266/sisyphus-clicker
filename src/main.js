import './style.css';
import { loadState, saveState, pushState, finishClimb, PUSHES_PER_CLIMB } from './state.js';
import { GameScene } from './scene.js';

let storage;
try { storage = window.localStorage; } catch { /* Play remains available without storage. */ }
const state = loadState(storage);
const button = document.querySelector('#push');
const status = document.querySelector('#status');
const scene = new GameScene(document.querySelector('#scene'), state);
let resetStarted = state.isResetting ? performance.now() : null;
let pressTimer;
function updateHUD() {
  document.querySelector('#total').textContent = state.totalPushes.toLocaleString('en-US');
  document.querySelector('#progress').textContent = Math.floor(state.climbPushes / PUSHES_PER_CLIMB * 100);
  document.querySelector('#progress-bar').style.width = `${state.climbPushes / PUSHES_PER_CLIMB * 100}%`;
  document.querySelector('#climbs').textContent = state.completedClimbs.toLocaleString('en-US');
  button.disabled = state.isResetting;
  if (!saveState(storage, state)) document.querySelector('#save-status').textContent = 'SAVING UNAVAILABLE IN THIS BROWSER';
}
function push() {
  if (!pushState(state)) return;
  scene.push();
  button.classList.add('pressed');
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => button.classList.remove('pressed'), 110);
  if (state.isResetting) { resetStarted = performance.now(); status.textContent = 'For a moment, the world is still.'; }
  else if (state.climbPushes > 74) status.textContent = 'So close to the sky.';
  else if (state.climbPushes > 35) status.textContent = 'The mountain is patient. So are you.';
  else status.textContent = state.completedClimbs > 0n ? 'And still, we begin again.' : 'A little higher. Again.';
  updateHUD();
}
document.querySelector('#game').addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button, a')) return;
  push();
});
button.addEventListener('click', push);
window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.target.closest('a')) return;
  event.preventDefault();
  if (!event.repeat) push();
});
window.addEventListener('pagehide', () => saveState(storage, state));
function frame(time) {
  let reset = null;
  if (resetStarted !== null) {
    reset = (time - resetStarted) / 1000;
    if (reset > .5) status.textContent = 'The stone returns. The story continues.';
    if (reset >= 2.9) {
      finishClimb(state); resetStarted = null; reset = null;
      scene.finishReset(); status.textContent = 'And still, we begin again.'; updateHUD();
    }
  }
  scene.draw(time, reset);
  requestAnimationFrame(frame);
}
updateHUD();
requestAnimationFrame(frame);
