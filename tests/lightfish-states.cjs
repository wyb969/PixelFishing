'use strict';
const fs=require('node:fs'),M=require('../dist/motion.js'),F=require('../dist/fishing.js'),L=require('../dist/searchlight.js');
const strength=.18*(1+.12*.65),groups={},fields=[];
function setup(dir){const s=M.create();s.boat.dir=dir;s.fishing=F.create();Object.assign(s.fishing,{stage:2,dir,wait:1e9,age:0});return s;}
function tick(s,t,day){M.update(s,1/30,t,1/30,{dayTime:day,strength});s.visualBoatY=M.visualBoatY(s,t,strength);s.visualBoatTilt=Math.sin(t*.7)*.025;F.update(s,1/30);}
function pack(s,t,day,seconds){const b=s.boat,f=s.fishing,l=s.searchlight;return{t,day,seconds,boat:[b.x,b.y,b.vx,b.dir],fish:Array.from(M.packed(s)),tackle:F.packed(f),fishingInfo:[f.id,f.tension,f.caught,f.dir],light:[l.x,l.y,l.angle,l.power],edges:L.edges(l,M.shore)};}
for(const dir of [1,-1]){const s=setup(dir),arrival=[],motion=[];
 for(let i=0;i<3600;i++){const t=i/30*.65;tick(s,t,45);if([0,300,900,1800,3599].includes(i))arrival.push(pack(s,t,45,i/30));if(i>=1800&&i<1980)motion.push(pack(s,t,45,i/30));}
 groups['arrival-'+dir]=arrival;groups['school-'+dir]=motion;
 for(const t of [0,12,27]){tick(s,t,45);const l=s.searchlight,samples=[];for(let y=220;y<260;y+=3)for(let x=160;x<480;x+=5){const p={x:x+.5,y:y+.5};samples.push([x,y,L.field(l,p).brightness]);}fields.push({...pack(s,t,45,0),samples});}
}
const dusk=setup(1);groups.dusk=[];for(let i=0;i<180;i++){const t=10+i/30*.65,day=28+i/30;tick(dusk,t,day);groups.dusk.push(pack(dusk,t,day,i/30));}
const moving=setup(1);groups.moving=[];for(let i=0;i<2700;i++){const t=i/30*.65;if(i===900)M.target(moving,230,225);if(i===1800)M.target(moving,385,225);tick(moving,t,45);if(i%90===0)groups.moving.push(pack(moving,t,45,i/30));}
fs.writeFileSync(process.argv[2],JSON.stringify({groups,fields}));
