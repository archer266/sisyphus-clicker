import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, pushState, finishClimb, loadState, saveState, PUSHES_PER_CLIMB } from '../src/state.js';
import { advanceBoulder } from '../src/physics.js';
const memory = () => { let value=null; return {getItem:()=>value,setItem:(_,v)=>{value=v;}}; };
test('summit locks input, returning preserves lifetime pushes, and cycles repeat', () => {
  const state=newState();
  for(let cycle=0;cycle<3;cycle++){
    while (!state.isResetting) { assert.equal(pushState(state),true); advanceBoulder(state, .05, PUSHES_PER_CLIMB); }
    assert.equal(state.isResetting,true);assert.equal(pushState(state),false);
    finishClimb(state);assert.equal(state.climbPushes,0);
    assert.ok(state.totalPushes>BigInt((cycle+1)*PUSHES_PER_CLIMB));
    assert.equal(state.completedClimbs,BigInt(cycle+1));
  }
});
test('save restores partial climbs and summit recovery',()=>{
  const state=newState(),storage=memory();pushState(state);saveState(storage,state);
  advanceBoulder(state,.05,PUSHES_PER_CLIMB);saveState(storage,state);
  assert.equal(loadState(storage).climbPushes,state.climbPushes);
  assert.equal(loadState(storage).totalPushes,state.totalPushes);
  assert.equal(loadState(storage).boulderVelocity,0);
  while(!state.isResetting){pushState(state);advanceBoulder(state,.05,PUSHES_PER_CLIMB);}
  saveState(storage,state);const restored=loadState(storage);assert.equal(restored.isResetting,true);
  finishClimb(restored);assert.equal(restored.totalPushes,state.totalPushes);assert.equal(restored.completedClimbs,1n);
});
test('counters remain exact beyond Number.MAX_SAFE_INTEGER',()=>{
  const state=newState(),storage=memory();state.totalPushes=9007199254740993n;
  pushState(state);saveState(storage,state);assert.equal(loadState(storage).totalPushes,9007199254740994n);
});
test('corrupt or inaccessible storage permits a fresh playable game',()=>{
  assert.deepEqual(loadState({getItem:()=>'{invalid'}),newState());
  assert.deepEqual(loadState(undefined),newState());assert.equal(saveState(undefined,newState()),false);
});
