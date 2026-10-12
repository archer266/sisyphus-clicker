import './style.css';
import { loadState, saveState, PUSHES_PER_CLIMB } from './state.js';
import { GameScene } from './scene.js';
import { GameSession } from './session.js';
import { BoulderAudio } from './audio.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Play is available without storage. */ }
const state = loadState(storage), session = new GameSession(state);
const settings = { muted: false, volume: .35, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
try {
  const saved = JSON.parse(storage.getItem('sisyphus-settings-v1'));
  if (saved) {
    if (typeof saved.muted === 'boolean') settings.muted = saved.muted;
    if (Number.isFinite(saved.volume)) settings.volume = Math.max(0, Math.min(1, saved.volume));
    if (typeof saved.reducedMotion === 'boolean') settings.reducedMotion = saved.reducedMotion;
  }
} catch { /* Use defaults. */ }
const audio = new BoulderAudio(settings);
const scene = new GameScene($('#scene'), state);
scene.reduced = settings.reducedMotion;
let started = false, lastFrame = null, lastSave = 0, lastHUD = 0, pressTimer;

function persist() {
  if (!saveState(storage, state)) $('#save-status').textContent = 'SAVING UNAVAILABLE — EXPORT A BACKUP';
  try { storage.setItem('sisyphus-settings-v1', JSON.stringify(settings)); } catch { /* In-memory settings still work. */ }
}
function updateHUD() {
  $('#total').textContent = state.totalPushes.toLocaleString('en-US');
  $('#progress').textContent = Math.floor(state.climbPushes / PUSHES_PER_CLIMB * 100);
  $('#progress-bar').style.width = `${state.climbPushes / PUSHES_PER_CLIMB * 100}%`;
  $('#climbs').textContent = state.completedClimbs.toLocaleString('en-US');
  $('#push').disabled = session.paused || state.isResetting;
  const speed = state.boulderVelocity;
  $('#motion').textContent = state.isResetting ? 'SUMMIT REACHED' : Math.abs(speed) < .12 ? 'HOLDING GROUND' : speed < 0 ? 'ROLLING DOWN — CLICK TO BRAKE' : 'CLIMBING UPHILL';
  $('#speed-bar').style.width = `${Math.min(100, Math.abs(speed) / 12 * 100)}%`;
  $('#speed-bar').classList.toggle('downhill', speed < 0);
  if (session.resetElapsed !== null) $('#status').textContent = session.resetElapsed > .5 ? 'The stone returns. The story continues.' : 'For a moment, the world is still.';
  else if (speed < -.15) $('#status').textContent = 'Brake the roll. Then push again.';
  else if (state.climbPushes > 74) $('#status').textContent = 'So close to the sky.';
  else $('#status').textContent = state.completedClimbs > 0n ? 'And still, we begin again.' : 'A little higher. Again.';
}
function pause(reason = 'Take a breath. The mountain can wait.') {
  session.pause(); audio.update(0, true); lastFrame = null; persist(); updateHUD();
  $('#pause-title').textContent = started ? 'The ascent is paused.' : 'The eternal ascent';
  $('#pause-reason').textContent = started ? reason : 'Reach the summit. Begin again. Every push counts.';
  $('#resume').textContent = started ? 'RESUME ASCENT' : 'BEGIN ASCENT';
  if (!document.querySelector('dialog[open]')) $('#pause-dialog').showModal();
}
function resume() {
  if (document.hidden || !document.hasFocus()) return;
  for (const dialog of document.querySelectorAll('dialog')) if (dialog.open) dialog.close();
  started = true; session.resume(); lastFrame = null; audio.unlock(); updateHUD();
}
function push() {
  if (!session.push()) return;
  audio.unlock(); audio.push(); scene.push(session.time * 1000);
  $('#push').classList.add('pressed'); clearTimeout(pressTimer);
  pressTimer = setTimeout(() => $('#push').classList.remove('pressed'), 110);
  updateHUD(); persist();
}
$('#game').addEventListener('pointerdown', event => {
  if (event.button === 0 && !event.target.closest('button, a, input, dialog, label')) push();
});
$('#push').addEventListener('click', push);
$('#resume').addEventListener('click', resume);
$('#pause').addEventListener('click', () => pause());
$('.wordmark').addEventListener('click', event => { event.preventDefault(); pause(); });
function showSettings() {
  pause(); $('#pause-dialog').close(); $('#settings-dialog').showModal();
}
$('#settings').addEventListener('click', showSettings);
$('#pause-settings').addEventListener('click', showSettings);
$('#settings-close').addEventListener('click', () => { $('#settings-dialog').close(); pause(); });
$('#mute').checked = settings.muted; $('#volume').value = settings.volume * 100; $('#reduced-motion').checked = settings.reducedMotion;
for (const id of ['mute', 'volume', 'reduced-motion']) $(`#${id}`).addEventListener('input', () => {
  settings.muted = $('#mute').checked; settings.volume = Number($('#volume').value) / 100;
  settings.reducedMotion = $('#reduced-motion').checked; scene.reduced = settings.reducedMotion;
  audio.unlock(); audio.update(0, true); persist();
});
async function fullscreen() {
  try {
    if (window.desktop) await window.desktop.toggleFullscreen();
    else if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { $('#status').textContent = 'Fullscreen is unavailable in this window.'; }
}
$('#fullscreen').addEventListener('click', fullscreen);
$('#restart').addEventListener('click', () => { $('#settings-dialog').close(); $('#restart-dialog').showModal(); });
$('#restart-cancel').addEventListener('click', () => { $('#restart-dialog').close(); $('#settings-dialog').showModal(); });
$('#restart-confirm').addEventListener('click', () => {
  session.restart(); scene.finishReset(); started = false; $('#restart-dialog').close(); persist(); updateHUD(); pause();
});
$('#export').addEventListener('click', async () => {
  try {
    const json = JSON.stringify({...state,totalPushes:String(state.totalPushes),completedClimbs:String(state.completedClimbs)},null,2);
    if (window.desktop) {
      const exported = await window.desktop.exportSave(json);
      $('#backup-status').textContent = exported ? 'Save exported.' : 'Export canceled.';
    } else {
      const blob = new Blob([json], {type:'application/json'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'sisyphus-save.json'; $('#settings-dialog').append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); $('#backup-status').textContent = 'Save exported.';
    }
  } catch { $('#backup-status').textContent = 'Export failed. Choose a writable location and try again.'; }
});
$('#import').addEventListener('click', () => $('#import-file').click());
let pendingImport = null;
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('File too large');
    const raw = await file.text(), parsed = JSON.parse(raw);
    if (!/^\d+$/.test(String(parsed.totalPushes)) || !/^\d+$/.test(String(parsed.completedClimbs)) || !Number.isFinite(parsed.climbPushes) || parsed.climbPushes < 0 || parsed.climbPushes > PUSHES_PER_CLIMB) throw new Error('Invalid save');
    pendingImport = loadState({getItem: () => raw});
    $('#settings-dialog').close(); $('#import-dialog').showModal();
  } catch { $('#backup-status').textContent = 'That file is not a valid Sisyphus save.'; }
});
$('#import-cancel').addEventListener('click', () => { pendingImport = null; $('#import-dialog').close(); $('#settings-dialog').showModal(); });
$('#import-confirm').addEventListener('click', () => {
  Object.assign(state,pendingImport); pendingImport = null;
  session.resetElapsed = state.isResetting ? 0 : null; scene.finishReset(); started = true;
  $('#import-dialog').close(); persist(); updateHUD(); pause('Save imported. Resume when you are ready.');
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (dialog.id !== 'pause-dialog') { dialog.close(); pause(); }
});
window.addEventListener('keydown', event => {
  const formControl = event.target.closest('input, button, select, a');
  if (event.code === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); pause(); }
  if (event.code === 'KeyP' && !event.target.closest('input, select') && !event.repeat && !$('#settings-dialog').open && !$('#restart-dialog').open && !$('#import-dialog').open) {
    event.preventDefault(); session.paused ? resume() : pause();
  }
  if (event.code === 'F11') { event.preventDefault(); if (!event.repeat) fullscreen(); }
  if (event.code === 'Space' && !formControl && !document.querySelector('dialog[open]')) { event.preventDefault(); if (!event.repeat) push(); }
});
window.addEventListener('blur', () => pause('Window inactive. Resume when you are ready.'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('The window was hidden. Your progress is safe.'); });
window.desktop?.onPause(() => pause('Window inactive. Resume when you are ready.'));
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', persist);
function frame(time) {
  const delta = lastFrame === null ? 0 : Math.max(0,(time-lastFrame)/1000); lastFrame = time;
  if (session.tick(delta)) scene.finishReset();
  scene.draw(session.time * 1000, session.resetElapsed);
  audio.update(state.boulderVelocity, session.paused || state.isResetting);
  if (time-lastHUD>=80) { updateHUD(); lastHUD=time; }
  if (time-lastSave>=1000) { persist(); lastSave=time; }
  requestAnimationFrame(frame);
}
updateHUD(); pause(); requestAnimationFrame(frame);
