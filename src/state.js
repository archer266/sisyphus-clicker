import { clickImpulse, ROLLBACK_DELAY } from './physics.js';

export const PUSHES_PER_CLIMB = 100;
// Keep the original storage key so the name correction preserves existing saves.
export const SAVE_KEY = 'sysyphus-clicker-v1';
export function newState() { return { totalPushes: 0n, climbPushes: 0, completedClimbs: 0n, isResetting: false, boulderVelocity: 0, timeSincePush: ROLLBACK_DELAY }; }
export function loadState(storage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (!data) return newState();
    const totalPushes = BigInt(data.totalPushes), completedClimbs = BigInt(data.completedClimbs);
    if (totalPushes < 0n || completedClimbs < 0n || !Number.isFinite(data.climbPushes) || data.climbPushes < 0 || data.climbPushes > PUSHES_PER_CLIMB) return newState();
    return { ...newState(), totalPushes, completedClimbs, climbPushes: data.climbPushes, isResetting: data.climbPushes === PUSHES_PER_CLIMB };
  } catch { return newState(); }
}
export function saveState(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify({ ...state, totalPushes: String(state.totalPushes), completedClimbs: String(state.completedClimbs) })); return true; } catch { return false; }
}
export function pushState(state) {
  if (state.isResetting) return false;
  state.totalPushes += 1n;
  clickImpulse(state);
  return true;
}
export function finishClimb(state) {
  if (!state.isResetting) return;
  state.completedClimbs += 1n;
  state.climbPushes = 0;
  state.isResetting = false;
  state.boulderVelocity = 0;
  state.timeSincePush = ROLLBACK_DELAY;
}
