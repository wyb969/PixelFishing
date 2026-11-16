'use strict';
const fs=require('node:fs'),Motion=require('../dist/motion.js'),Fishing=require('../dist/fishing.js');
function pack(s,t){const b=s.boat,f=s.fishing;return{t,boat:[b.x,b.y,b.vx,b.dir],fish:Array.from(Motion.packed(s)),tackle:Fishing.packed(f),fishingInfo:[f.id,f.stage===4?f.tension:0,f.caught,f.dir]};}
const school=Motion.create();school.fishing=Fishing.create();school.fishing.stage=0;const free=[],fight=[];
for(let i=0;i<120;i++){Motion.update(school,1/30,12+i/30,1/30);free.push(pack(school,12+i/30));}
for(const dir of [1,-1]){const s=Motion.create();s.fishing=Fishing.create();Object.assign(s.fishing,{stage:4,id:3,duration:8,dir});s.boat.dir=dir;for(let i=0;i<120;i++){Motion.update(s,1/30,12+i/30,1/30);Fishing.update(s,1/30,()=>.1);fight.push({...pack(s,12+i/30),dir});}}
fs.writeFileSync(process.argv[2],JSON.stringify({free,fight}));
