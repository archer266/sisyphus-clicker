import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, loadState, saveState } from '../src/state.js';
import { GameSession } from '../src/session.js';
const tick=(game,seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)game.tick(1/fps);};
test('start, pause and focus-loss pause freeze position, momentum, time and clicks',()=>{
  const game=new GameSession({...newState(),climbPushes:50});
  assert.equal(game.push(),false);tick(game,5);assert.equal(game.state.climbPushes,50);
  game.resume();game.push();tick(game,1);game.pause();
  const frozen=structuredClone(game.state),time=game.time;
  tick(game,10);assert.deepEqual(game.state,frozen);assert.equal(game.time,time);assert.equal(game.push(),false);
  game.resume();tick(game,.1);assert.notEqual(game.state.climbPushes,frozen.climbPushes);
});
test('summit return freezes when paused, completes once, and clears momentum',()=>{
  const game=new GameSession({...newState(),climbPushes:99.99});game.resume();game.push();tick(game,.1);
  assert.equal(game.state.isResetting,true);game.pause();const elapsed=game.resetElapsed;
  tick(game,10);assert.equal(game.resetElapsed,elapsed);assert.equal(game.state.completedClimbs,0n);
  game.resume();tick(game,3);assert.equal(game.state.completedClimbs,1n);assert.equal(game.state.climbPushes,0);
  assert.equal(game.state.boulderVelocity,0);assert.equal(game.state.totalPushes,1n);
});
test('restart clears counters and physics; save/load restores position at rest',()=>{
  const game=new GameSession({...newState(),climbPushes:45.12,completedClimbs:4n,totalPushes:999n});
  game.resume();game.push();tick(game,.2);let raw;
  saveState({setItem:(_,value)=>{raw=value;}},game.state);
  const loaded=loadState({getItem:()=>raw});
  assert.equal(loaded.climbPushes,game.state.climbPushes);assert.equal(loaded.totalPushes,1000n);assert.equal(loaded.boulderVelocity,0);
  game.restart();assert.deepEqual(game.state,newState());assert.equal(game.paused,true);assert.equal(game.time,0);
});
test('fixed timestep agrees across frame rates and caps stalls',()=>{
  const run=fps=>{const game=new GameSession({...newState(),climbPushes:70});game.resume();tick(game,3,fps);return game.state;};
  const reference=run(60);
  for(const fps of [30,120,144]){
    const other=run(fps);assert.ok(Math.abs(other.climbPushes-reference.climbPushes)<1e-8);
    assert.ok(Math.abs(other.boulderVelocity-reference.boulderVelocity)<1e-8);
  }
  const game=new GameSession({...newState(),climbPushes:50,boulderVelocity:-8});game.resume();game.tick(60);
  assert.ok(game.state.climbPushes>=49.6);assert.ok(game.time<=.051);
});
