const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../dist/motion.js'),F=require('../dist/fishing.js');
function run(random){const s=M.create();s.fishing=F.create();const stages=new Set(),frames=[];let fightPositions=[];
 for(let i=0;i<900;i++){M.update(s,1/15,i/15,1/15*.65);F.update(s,1/15,random);const a=s.fishing,b=s.boat;stages.add(a.stage);
 if(a.stage===4){assert.ok(a.id>=0&&a.id<14);assert.equal(a.x,s.fish[a.id].x);assert.equal(a.y,s.fish[a.id].y);fightPositions.push([a.x,a.y]);}
 frames.push({boat:[b.x,b.y,b.vx,b.dir],fish:Array.from(M.packed(s)),tackle:F.packed(a),fishingInfo:[a.id,a.stage===4?a.tension:0,a.caught,a.dir]});}
 assert.ok(stages.has(1)&&stages.has(2)&&stages.has(3)&&stages.has(4));assert.ok(fightPositions.length>10);assert.ok(Math.max(...fightPositions.map(p=>p[0]))-Math.min(...fightPositions.map(p=>p[0]))>10,'Hooked fish must visibly run');return{s,frames,stages};}
const success=run(()=>.49),failure=run(()=>.5);assert.ok(success.s.fishing.caught>0&&success.s.fishing.escaped===0);assert.ok(failure.s.fishing.escaped>0&&failure.s.fishing.caught===0);assert.ok(success.stages.has(5)&&failure.stages.has(6));
let seed=45;const demo=run(()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;});fs.writeFileSync('analysis/motion-frames.json',JSON.stringify(demo.frames));
console.log('PASS: casting, attraction, real-fish hook linkage, struggling movement, landing, escape, 0.5 outcome threshold.');
