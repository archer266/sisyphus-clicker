import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, pushState, finishClimb, PUSHES_PER_CLIMB, loadState, SAVE_KEY } from '../src/state.js';
import { advanceBoulder, MAX_UPHILL_SPEED, MAX_DOWNHILL_SPEED } from '../src/physics.js';

function simulate(seconds, rate = 0, fps = 60, state = { ...newState(), climbPushes: 20 }) {
  let nextClick = 0;
  for (let frame = 0; frame < seconds * fps; frame++) {
    const time = frame / fps;
    while (rate > 0 && time + 1e-9 >= nextClick) { pushState(state); nextClick += 1 / rate; }
    advanceBoulder(state, 1 / fps, PUSHES_PER_CLIMB);
  }
  return state;
}

test('idle rolls downhill gradually, accelerates, and preserves clicks', () => {
  const state = { ...newState(), climbPushes: 20 };
  advanceBoulder(state,.05,PUSHES_PER_CLIMB);
  assert.ok(state.boulderVelocity < 0 && state.boulderVelocity > -.2);
  const initialSpeed = state.boulderVelocity;
  simulate(5,0,60,state);
  assert.ok(state.climbPushes < 16 && state.boulderVelocity < initialSpeed);
  assert.ok(state.boulderVelocity >= -MAX_DOWNHILL_SPEED);
  assert.equal(state.totalPushes,0n);
});

test('slow clicks lose ground; normal and very fast clicks gain progressively more', () => {
  const slow=simulate(10,.5),normal=simulate(10,2),fast=simulate(10,20);
  assert.ok(slow.climbPushes < 20);
  assert.ok(normal.climbPushes > 30);
  assert.ok(fast.climbPushes > normal.climbPushes + 40);
  assert.ok(fast.boulderVelocity <= MAX_UPHILL_SPEED);
});

test('stopping coasts uphill before reversing; resuming must counter momentum', () => {
  const state=simulate(2,20);
  const position=state.climbPushes;
  simulate(.5,0,60,state);
  assert.ok(state.climbPushes > position && state.boulderVelocity > 0);
  simulate(3,0,60,state);
  assert.ok(state.boulderVelocity < 0);
  const downhill=state.boulderVelocity;
  pushState(state);
  assert.ok(state.boulderVelocity > 0 && state.boulderVelocity < 4);
  assert.ok(downhill < 0);
});

test('bottom clamps position and momentum and permits pushing again', () => {
  const state=simulate(8,0,60,{...newState(),climbPushes:1});
  assert.equal(state.climbPushes,0);assert.equal(state.boulderVelocity,0);
  pushState(state);advanceBoulder(state,.05,PUSHES_PER_CLIMB);
  assert.ok(state.climbPushes>0);
});

test('summit is reached by motion, locks input, then resets all physics', () => {
  const state={...newState(),climbPushes:99.9};
  pushState(state);assert.equal(state.isResetting,false);
  simulate(1,0,60,state);
  assert.equal(state.climbPushes,100);assert.equal(state.isResetting,true);
  assert.equal(state.boulderVelocity,0);assert.equal(pushState(state),false);
  finishClimb(state);assert.equal(state.climbPushes,0);assert.equal(state.boulderVelocity,0);
  assert.equal(state.completedClimbs,1n);assert.equal(state.totalPushes,1n);
});

test('30, 60 and 144 FPS agree and a lag spike cannot teleport the boulder', () => {
  const positions=[30,60,144].map(fps=>simulate(10,2,fps).climbPushes);
  assert.ok(Math.max(...positions)-Math.min(...positions)<.01,positions.join(', '));
  const state={...newState(),climbPushes:20,boulderVelocity:12};
  advanceBoulder(state,30,PUSHES_PER_CLIMB);
  assert.ok(state.climbPushes>20 && state.climbPushes<=20.6);
});

test('original integer saves and new fractional saves retain progress', () => {
  for(const progress of [42,42.125,100]) {
    const state=loadState({getItem:key=>key===SAVE_KEY?JSON.stringify({totalPushes:'123',completedClimbs:'2',climbPushes:progress}):null});
    assert.equal(state.climbPushes,progress);assert.equal(state.totalPushes,123n);
    assert.equal(state.isResetting,progress===100);
  }
});
