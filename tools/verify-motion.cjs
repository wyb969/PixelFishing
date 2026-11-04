const assert=require('node:assert/strict');
const fs=require('node:fs');
const M=require('../dist/motion.js');
const s=M.create();const before=M.packed(s);M.target(s,999,999);assert.equal(s.boat.targetX,495);assert.ok(s.boat.targetY<=M.shore(495)-7);
const high=M.create(),low=M.create();M.target(high,350,-999);M.target(low,350,999);
for(let i=0;i<120;i++){M.update(high,1/60,i/60);M.update(low,1/60,i/60);}
assert.equal(high.boat.y,225);assert.equal(low.boat.y,225);assert.equal(high.boat.targetY,low.boat.targetY,'Vertical pointer coordinates must not move the boat');
M.update(s,.016,0);assert.ok(s.boat.x>315&&s.boat.x<495,'Boat should glide rather than teleport');
for(let i=0;i<600;i++)M.update(s,1/60,i/60);
assert.ok(Math.abs(s.boat.x-495)<.01);assert.notDeepEqual(M.packed(s),before);
for(const f of s.fish){assert.ok(Number.isFinite(f.x+f.y+f.vx+f.vy));assert.ok(f.x>=160&&f.x<=500);assert.ok(f.y>=227&&f.y<=M.shore(f.x)-4);}
const near=M.create(),far=M.create();near.boat.x=near.boat.targetX=near.fish[0].x;near.boat.y=near.boat.targetY=near.fish[0].y-4;far.boat.x=far.boat.targetX=495;
M.update(near,.1,0);M.update(far,.1,0);assert.notEqual(near.fish[0].vy,far.fish[0].vy,'Boat proximity must alter fish steering');
const demo=M.create(),frames=[];
for(let i=0;i<900;i++){if(i===90)M.target(demo,415,229);if(i===210)M.target(demo,230,229);if(i===360)M.target(demo,350,228);M.update(demo,1/15,i/15,1/15*.65);const b=demo.boat;frames.push({boat:[b.x,b.y,b.vx,b.dir],fish:Array.from(M.packed(demo))});}
fs.writeFileSync('analysis/motion-frames.json',JSON.stringify(frames));
console.log('PASS: boat bounds, smooth movement, fish animation, water bounds, boat avoidance; preview trajectory exported.');
