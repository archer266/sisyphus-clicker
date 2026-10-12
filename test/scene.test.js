import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameScene } from '../src/scene.js';
import { newState } from '../src/state.js';

test('Sisyphus shares the boulder position and rotation follows signed travel',()=>{
  globalThis.matchMedia=()=>({matches:false});globalThis.innerWidth=1280;
  globalThis.window={addEventListener:()=>{}};
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop:()=>{}})},{get:(object,key)=>key in object?object[key]:()=>{}});
  const state={...newState(),climbPushes:50};
  const scene=new GameScene({getContext:()=>ctx,clientHeight:800},state);
  let person,rock,angle;
  scene.character=(x,y)=>{person=[x,y];};scene.boulder=(x,y,a)=>{rock=[x,y];angle=a;};
  scene.draw(0,null);assert.deepEqual(person,rock);assert.equal(angle,0);
  state.climbPushes=51;state.boulderVelocity=2;scene.draw(16,null);
  assert.deepEqual(person,rock);
  const expected=Math.hypot(scene.end.x-scene.start.x,scene.end.y-scene.start.y)*.01/(31*scene.scale);
  assert.ok(Math.abs(angle-expected)<1e-10);
  state.climbPushes=50;state.boulderVelocity=-2;scene.draw(32,null);
  assert.deepEqual(person,rock);assert.ok(Math.abs(angle)<1e-10);
  const dust=structuredClone(scene.dust);scene.draw(32,null);
  assert.deepEqual(scene.dust,dust);assert.ok(Math.abs(angle)<1e-10);
});
