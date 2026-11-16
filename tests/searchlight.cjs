'use strict';
const assert=require('node:assert/strict'),L=require('../dist/searchlight.js'),M=require('../dist/motion.js');
for(const dir of [-1,1]){
 const light=L.frame({x:315,dir},0,40,225);assert.equal(light.power,1);
 const aim={x:dir*Math.cos(light.angle),y:Math.sin(light.angle)};
 const center={x:light.x+50*aim.x,y:light.y+50*aim.y};assert.equal(L.field(light,center).normalized,1);assert.equal(L.field(light,center).brightness,.7);
 const edges=L.edges(light,M.shore);assert(edges.length>0);for(const e of edges){assert(Math.abs(L.field(light,e).normalized-e.level)<.0001);assert(e.y>=229&&e.y<=M.shore(e.x)-6);}
}
assert.equal(L.frame({x:315,dir:1},0,10,225).power,0);
let last=1;for(let d=0;d<=3;d+=.01){const power=L.frame({x:315,dir:1},0,d,225).power;assert(power<=last+.00001);last=power;}
assert.equal(L.edges(L.frame({x:315,dir:1},0,40,100),M.shore).length,0);
const day=M.create(),old=M.create();for(let i=0;i<500;i++){M.update(day,.02,i*.02,.02,{dayTime:10,strength:.5});M.update(old,.02,i*.02);assert.deepEqual(day.fish,old.fish);}
let targetCount=0,maxStep=0;const targets=new Set();
for(const dir of [-1,1]){
 const s=M.create();s.boat.dir=dir;
 for(let i=0;i<6000;i++){
  if(i===3000)M.target(s,dir===1?400:240,225);
  const before=s.fish.map(f=>({...f}));M.update(s,.02,i*.02,.02,{dayTime:40,strength:.3});
  assert.equal(s.searchlight.dir,s.boat.dir);assert(Math.abs(s.searchlight.x-s.boat.x-.6*s.boat.dir)<1e-7);
  for(let j=0;j<14;j++){
   const f=s.fish[j],step=Math.hypot(f.x-before[j].x,f.y-before[j].y);maxStep=Math.max(maxStep,step);assert(step<.4);assert(f.x>=160&&f.x<=500&&f.y>=227&&f.y<=M.shore(f.x)-4);
   if(f.lightTarget){const v=L.field(s.searchlight,f.lightTarget).normalized;assert(v>=.1499&&v<=.2501);targetCount++;targets.add(Math.round(f.lightTarget.x)+','+Math.round(f.lightTarget.y));}
  }
 }
 const fish=JSON.stringify(s.fish);M.update(s,.02,121,0,{dayTime:40,strength:.3});assert.equal(JSON.stringify(s.fish),fish);
 for(const stage of [3,4,5,6]){s.fishing={id:0,stage};const f={...s.fish[0]};M.update(s,.02,122,.02,{dayTime:40,strength:.3});for(const key of ['x','y','vx','vy','phase','age'])assert.equal(s.fish[0][key],f[key]);}
}
assert(targetCount>1000);assert(targets.size>30);
console.log(`PASS light field/inverted contour, left/right/moving boats, day exact legacy, twilight, unreachable, pause, fishing ownership; ${targetCount} targets, ${targets.size} locations, max step ${maxStep.toFixed(3)}px.`);
// Compare actual trajectories, not just assigned targets, against a no-light control.
const attracted=M.create(),control=M.create();let attractedDistance=0,controlDistance=0,samples=0;
for(let i=0;i<12000;i++){
 const t=i*.02;M.update(attracted,.02,t,.02,{dayTime:40,strength:.3});M.update(control,.02,t);
 if(i>6000&&i%10===0){const edges=L.edges(attracted.searchlight,M.shore);if(edges.length)for(let j=0;j<14;j++){
  attractedDistance+=Math.min(...edges.map(e=>Math.hypot(e.x-attracted.fish[j].x,e.y-attracted.fish[j].y)));
  controlDistance+=Math.min(...edges.map(e=>Math.hypot(e.x-control.fish[j].x,e.y-control.fish[j].y)));samples++;
 }}
}
assert(samples>0&&attractedDistance<controlDistance*.5);
console.log(`PASS actual late-run distance to light edge: ${(attractedDistance/samples).toFixed(2)}px vs unlit ${(controlDistance/samples).toFixed(2)}px.`);
