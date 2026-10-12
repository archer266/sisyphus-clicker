import { pushState, finishClimb, newState, PUSHES_PER_CLIMB } from './state.js';
import { advanceBoulder, MAX_FRAME_DELTA } from './physics.js';
export const FIXED_STEP = 1 / 240;
export const RETURN_DURATION = 2.9;
// One simulation clock drives physics, effects and the summit sequence.
export class GameSession {
  constructor(state) {
    this.state = state; this.paused = true; this.time = 0; this.accumulator = 0;
    this.resetElapsed = state.isResetting ? 0 : null;
  }
  pause() { this.paused = true; this.accumulator = 0; }
  resume() { this.paused = false; this.accumulator = 0; }
  push() { return !this.paused && pushState(this.state); }
  restart() {
    Object.assign(this.state, newState());
    this.time = 0; this.accumulator = 0; this.resetElapsed = null; this.pause();
  }
  tick(delta) {
    let completed = false;
    if (this.paused || !Number.isFinite(delta) || delta <= 0) return completed;
    this.accumulator += Math.min(delta, MAX_FRAME_DELTA);
    while (this.accumulator + 1e-10 >= FIXED_STEP) {
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP);
      this.time += FIXED_STEP;
      if (this.resetElapsed !== null) {
        this.resetElapsed += FIXED_STEP;
        if (this.resetElapsed >= RETURN_DURATION) {
          finishClimb(this.state); this.resetElapsed = null; completed = true;
        }
      } else {
        advanceBoulder(this.state, FIXED_STEP, PUSHES_PER_CLIMB);
        if (this.state.isResetting) this.resetElapsed = 0;
      }
    }
    return completed;
  }
}
