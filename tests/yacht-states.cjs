'use strict';
const Motion=require('../dist/motion.js'),Fishing=require('../dist/fishing.js');
const states=[1,-1].map(dir=>{const s=Motion.create();s.fishing=Fishing.create();s.boat.dir=dir;Object.assign(s.fishing,{stage:2,dir,wait:100,age:0});s.visualBoatY=Motion.visualBoatY(s,16,.18);s.visualBoatTilt=Math.sin(16*.7)*.025;Fishing.update(s,.1);const b=s.boat,f=s.fishing;return{dir,boat:[b.x,b.y,b.vx,b.dir],tackle:Fishing.packed(f),fishingInfo:[f.id,f.tension,f.caught,f.dir]};});
console.log(JSON.stringify(states));
