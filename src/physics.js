// Distances are hill-progress units (100 units per hill); time is in seconds.
export const CLICK_FORCE = 4;
export const DOWNHILL_GRAVITY = 3;
export const FRICTION = 3; // Exponential drag per second, not a per-frame multiplier.
export const MAX_UPHILL_SPEED = 12;
export const MAX_DOWNHILL_SPEED = 1.5;
export const ROLLBACK_DELAY = 0.3; // Gravity builds up after the most recent push.
export const MAX_FRAME_DELTA = 0.05; // Discard long pauses instead of catching up.
const STEP = 1 / 240;

export function clickImpulse(state) {
  state.boulderVelocity = Math.min(MAX_UPHILL_SPEED, state.boulderVelocity + CLICK_FORCE);
  state.timeSincePush = 0;
}

export function advanceBoulder(state, delta, summit) {
  if (state.isResetting || !Number.isFinite(delta) || delta <= 0) return;
  let remaining = Math.min(delta, MAX_FRAME_DELTA);
  while (remaining > 1e-10) {
    const dt = Math.min(STEP, remaining);
    remaining -= dt;
    state.timeSincePush = Math.min(ROLLBACK_DELAY, state.timeSincePush + dt);
    // A little gravity acts even during a push; the full weight settles in gradually.
    const gravity = DOWNHILL_GRAVITY * (0.25 + 0.75 * state.timeSincePush / ROLLBACK_DELAY);
    const decay = Math.exp(-FRICTION * dt);
    const terminal = -gravity / FRICTION;
    const velocity = state.boulderVelocity;
    state.boulderVelocity = Math.max(-MAX_DOWNHILL_SPEED,
      Math.min(MAX_UPHILL_SPEED, terminal + (velocity - terminal) * decay));
    state.climbPushes += (velocity + state.boulderVelocity) * 0.5 * dt;
    if (state.climbPushes <= 0) {
      state.climbPushes = 0;
      state.boulderVelocity = Math.max(0, state.boulderVelocity);
    }
    if (state.climbPushes >= summit) {
      state.climbPushes = summit;
      state.boulderVelocity = 0;
      state.isResetting = true;
      return;
    }
  }
}
