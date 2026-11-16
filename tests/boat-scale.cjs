'use strict';
const assert=require('node:assert/strict'),M=require('../dist/motion.js'),F=require('../dist/fishing.js');
assert.equal(M.BOAT_SCALE,1.2);
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function scene(){const s=M.create();s.fishing=F.create();s.visualBoatY=201;s.visualBoatTilt=.02;return s;}
for(const x of [155,315,495])for(const t of [0,3,20])for(const power of [0,1.9]){
 const s=scene();s.boat.x=x;const y=M.visualBoatY(s,t,power),tilt=Math.sin(t*.7)*.025;
 const world=(x0,y0)=>({x:x+x0*1.2,y:y+y0*1.2+x0*1.2*tilt});
 for(const p of [[0,0],[-24,-23],[24,7]])assert(M.hitBoat(s,world(...p),t,power));
 for(const p of [[-26,0],[26,0],[0,-25],[0,9]])assert(!M.hitBoat(s,world(...p),t,power));
}
for(const x of [200,430]){
 const s=scene();s.boat.x=x;const a=s.fishing;a.age=-.01;F.update(s,.01);const dir=x>390?-1:1;
 close(a.x,x+dir*22*1.2);close(a.y,201-19*1.2+dir*22*1.2*.02);
 a.stage=6;a.id=0;a.age=0;F.update(s,.01);close(a.x,x+dir*24*1.2);close(a.y,201-15*1.2+dir*24*1.2*.02);
 a.stage=4;a.age=8;a.duration=8;a.id=0;F.update(s,.01,()=>0);
 assert.equal(a.stage,5);const worldY=a.y+(201-s.boat.y)+(a.x-x)*.02;close(worldY,s.fish[0].y);
 a.age=2;F.update(s,.01);close(a.x,x+6*dir*1.2);close(a.y,225-5*1.2);
 const p={...s.fish[0]};M.update(s,.02,0);for(const k of ['x','y','vx','vy','phase'])close(s.fish[0][k],p[k]);
 a.age=4;F.update(s,.01);assert.equal(a.stage,0);assert.equal(a.caught,1);
 const escape=scene();Object.assign(escape.fishing,{stage:4,id:0,age:8,duration:8});F.update(escape,.01,()=>1);assert.equal(escape.fishing.stage,6);escape.fishing.age=2.5;F.update(escape,.01);assert.equal(escape.fishing.stage,0);assert.equal(escape.fishing.escaped,1);
}
const fallback=scene();delete fallback.visualBoatY;delete fallback.visualBoatTilt;fallback.fishing.age=-.01;F.update(fallback,.01);close(fallback.fishing.y,225-19*1.2);
// Both travel directions keep a finished catch attached to the scaled deck anchor.
for(const target of [155,495]){const s=scene();Object.assign(s.fishing,{stage:5,id:0,age:2,startX:360,startY:230,dir:target===155?-1:1});M.target(s,target,225);for(let i=0;i<40;i++){M.update(s,.02,i*.02);F.update(s,.02);close(s.fishing.x,s.boat.x+7.2*s.fishing.dir);close(s.fishing.y,219);}}
console.log('PASS: 1.2 boat scale, tilted wave hit box, cast/retract/deck anchors, no stage5 double wave offset, catch/escape, moving boat and exclusive fish ownership.');
