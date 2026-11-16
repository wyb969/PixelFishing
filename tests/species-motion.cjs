'use strict';
const assert=require('node:assert/strict'),Species=require('../dist/species.js'),Motion=require('../dist/motion.js');
// Stable order/ids preserve existing local journal saves; rarity only adds score metadata.
assert.deepEqual(Species.list.map(s=>s.id),['silverfin','goldfin','redtail','tealstripe','violetback','spottedgrouper']);
assert.deepEqual(Species.list.map(s=>s.rarity),[1,2,3,4,6,10]);
assert.deepEqual(Species.list.map(s=>s.rarityLabel),['普通','少见','珍奇','稀有','史诗','传说']);
assert(Species.list.every(Object.isFrozen));
assert.equal(Species.list.length,6);assert.equal(new Set(Species.list.map(s=>s.id)).size,6);assert.equal(new Set(Species.list.map(s=>s.color)).size,6);
for(let i=0;i<14;i++)assert.equal(Species.forFish(i),Species.list[i%6]);assert.equal(Species.forFish(-1),null);
for(const s of Species.list){assert(s.name&&s.description&&s.habitat);assert(s.rgb.every(v=>v>=0&&v<=1));assert(s.length>0&&s.girth>0&&s.tail>0);}
const state=Motion.create();assert.equal(state.fish.length,14);let maxStep=0,maxTurn=0;
for(let frame=0;frame<60000;frame++){
 const before=state.fish.map(f=>({...f}));
 if(frame%900===0)Motion.target(state,160+(frame/900%2)*335,225);
 Motion.update(state,.02,frame*.02);
 state.fish.forEach((f,i)=>{
  assert([f.x,f.y,f.vx,f.vy,f.heading,f.phase].every(Number.isFinite));assert(f.x>=160&&f.x<=500);assert(f.y>=227&&f.y<=Motion.shore(f.x)-4);
  const step=Math.hypot(f.x-before[i].x,f.y-before[i].y),turn=Math.abs(Math.atan2(Math.sin(f.heading-before[i].heading),Math.cos(f.heading-before[i].heading)));
  maxStep=Math.max(maxStep,step);maxTurn=Math.max(maxTurn,turn);assert(step<.4,'fish teleported');assert(turn<=.056001,'fish instant turn');
 });
}
assert.equal(Motion.packed(state).length,56);
for(const stage of [3,4,5,6]){
 const s=Motion.create();s.fishing={id:4,stage};const before={...s.fish[4]};Motion.update(s,.1,1);
 for(const key of ['x','y','vx','vy','phase','age'])assert.equal(s.fish[4][key],before[key],`stage ${stage} autonomous movement`);
 s.fish[4].vx=-7;s.fish[4].vy=2;assert(Math.abs(Motion.packed(s)[4*4+2]-Math.atan2(2,-7))<1e-6,'stale fishing heading');
}
const release=Motion.create();release.fish[0].x=510;release.fish[0].vx=-12;let old=510;for(let i=0;i<1000;i++){Motion.update(release,.02,i*.02);assert(Math.abs(release.fish[0].x-old)<.4);old=release.fish[0].x;}assert(old<500,'released fish did not re-enter');
const paused=Motion.create(),snap=JSON.stringify(paused.fish);Motion.update(paused,.1,0,0);assert.equal(JSON.stringify(paused.fish),snap);
for(const x of [155,315,495])for(const time of [0,3,15,60,600])for(const strength of [0,.18,1.9]){
 const s=Motion.create();s.boat.x=x;const y=Motion.visualBoatY(s,time,strength);assert(Number.isFinite(y)&&y>150&&y<226);
 if(strength===0)assert(Math.abs(y-(225+Math.sin(time*.85)*.35))<.001);
}
console.log(`PASS: 6 stable original species and modulo mapping; 14 fish over 1200s; max 20ms movement ${maxStep.toFixed(3)}px / turn ${maxTurn.toFixed(3)}rad; no boundary jumps; stages3–6 fishing ownership; live fishing heading; smooth offscreen re-entry; pause.`);
