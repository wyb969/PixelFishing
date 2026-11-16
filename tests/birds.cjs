'use strict';
const assert=require('node:assert/strict'),Birds=require('../dist/birds.js');
const clear={index:0,values:[0,.12,0,0],wind:.12};
const run=(s,seconds,w)=>{for(let i=0;i<Math.round(seconds*100);i++)Birds.update(s,.01,w,[0,1,0,0]);};
for(const index of [1,3,4,5]){
 const s=Birds.create();run(s,1,{...clear,index});assert(Birds.visibility(s)<.27);
 run(s,2,{...clear,index});assert(Birds.visibility(s)<.019,'cloudy birds linger');
 run(s,2,{...clear,index:0,values:[.8,.1,0,0]});assert(Birds.visibility(s)<.002,'returned before clouds cleared');
 run(s,1,clear);assert(Birds.visibility(s)>.1&&Birds.visibility(s)<.17,'clear recovery pops');
 run(s,20,clear);assert(Birds.visibility(s)>.96);
}
const breeze=Birds.create();run(breeze,30,{...clear,index:2,values:[.18,.9,0,0],wind:.8});assert(Birds.visibility(breeze)>.99,'sunny breeze incorrectly hides birds');
const state=Birds.create(),initial=Birds.packed(state);assert.equal(initial.length,36);assert(initial.every(Number.isFinite));
assert(Math.max(...state.birds.map(b=>b.scale))-Math.min(...state.birds.map(b=>b.scale))>.2,'depth scale insufficient');
assert(new Set(state.birds.map(b=>b.phase.toFixed(2))).size===9,'synchronized wings');
assert(Math.max(...state.birds.map(b=>b.scale))>1,'near silhouette too small');
assert(Math.min(...state.birds.map(b=>b.scale))<.4,'far silhouette too large');
let wraps=0,maxVisibleJump=0;
for(let frame=0;frame<120000;frame++){
 const old=state.birds.map(b=>({...b}));Birds.update(state,.01,frame%50000<25000?clear:{...clear,index:3},[0,1,0,0]);
 for(let i=0;i<9;i++){
  const b=state.birds[i],before=old[i];assert([b.x,b.y,b.scale,b.phase].every(Number.isFinite));assert(b.scale>=0&&b.scale<=1.60);assert(b.y>10&&b.y<200);
  if(b.cycles!==before.cycles){wraps++;assert(before.scale<.001,'reset before invisible');assert(b.x<-150,'re-entry on-screen');}
  else{const distance=Math.hypot(b.x-before.x,b.y-before.y);assert(distance<5,'position discontinuity');if(Birds.visibility(state)>.02&&b.x>-90){maxVisibleJump=Math.max(maxVisibleJump,distance);assert(distance<3,'visible position discontinuity');}}
 }
}
assert(wraps>50);
// Perspective causes actual on-screen speed to slow as distance grows.
const s=Birds.create(),b=s.birds[0];b.flight=.2;Birds.update(s,0,clear);const x0=b.x,scale0=b.scale;Birds.update(s,.1,clear);const nearSpeed=b.x-x0;
b.flight=.65;Birds.update(s,0,clear);const x1=b.x,scale1=b.scale;Birds.update(s,.1,clear);const farSpeed=b.x-x1;
assert(scale1<scale0);assert(Math.abs(farSpeed)<Math.abs(nearSpeed));
console.log(`PASS: cloudy/rain/snow/storm birds <1.9% opacity within 3s; delayed gradual clear recovery; sunny breeze retained; independent depth/phase, perspective speed decreases, ${wraps} invisible wraps, 1200s finite bounded trajectories, max 10ms movement ${maxVisibleJump.toFixed(3)}px.`);
