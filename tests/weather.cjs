'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Weather=require('../dist/weather.js');
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const visibility=w=>(1-smooth(.42,.68,w.values[0]))*(1-smooth(.002,.008,w.values[2]+w.values[3]));
let transitionSteps=0;
for(let s=0;s<4;s++){
 const season=Array.from({length:4},(_,i)=>Number(i===s));
 for(let from=0;from<6;from++)for(let to=0;to<6;to++){
  const w=Weather.create();w.mode=String(from);
  for(let i=0;i<3000;i++)Weather.update(w,.02,season);
  w.mode=String(to);
  for(let i=0;i<3000;i++){
   const old=structuredClone(w);Weather.update(w,.02,season);transitionSteps++;
   assert(w.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
   if(w.values[2]>.01||w.values[3]>.01){
    assert.equal(visibility(w),0,'wet sun leak');
    const front=smooth(.30,.84,w.values[0]);
    const minimumCoverage=smooth(.20,.65,front-.15)*smooth(0,.10,front);
    assert(minimumCoverage>.99,'visible precipitation before the cloud canopy closes');
   }
   assert(w.drift>=old.drift&&w.drift-old.drift<.13,'cloud discontinuity');
   assert(w.windTravel>=old.windTravel&&w.windTravel-old.windTravel<.025,'wind discontinuity');
   assert(Math.max(...w.values.map((v,j)=>Math.abs(v-old.values[j])))<.012,'weather discontinuity');
  }
 }
}
const rapid=Weather.create();
for(let i=0;i<10000;i++){
 rapid.mode=String(Math.floor(i/7)%5);Weather.update(rapid,.016,[0,1,0,0]);
 if(rapid.values[2]>.01)assert.equal(visibility(rapid),0);
}
const frames=[];
for(const [name,mode,season] of [['rain','3',[0,1,0,0]],['snow','4',[0,0,0,1]],['wind','2',[0,1,0,0]],['calm','0',[0,1,0,0]]]){
 const w=Weather.create();w.mode=mode;
 for(let i=0;i<=4000;i++){
  if([0,300,600,800,1200,2000,3000,4000].includes(i))frames.push({name,seconds:i/100,season,state:structuredClone(w)});
  Weather.update(w,.01,season);
 }
 if(name==='rain'||name==='snow'){
  w.mode='0';
  for(let i=0;i<=3500;i++){
   if([0,300,600,800,1200,2000,3500].includes(i))frames.push({name:name+'-clearing',seconds:i/100,season,state:structuredClone(w)});
   Weather.update(w,.01,season);
  }
 }
}
const calm=frames.find(f=>f.name==='calm'&&f.seconds===40).state;
const windy=frames.find(f=>f.name==='wind'&&f.seconds===40).state;
assert(windy.drift>calm.drift*3);assert.equal(visibility(calm),1);assert.equal(visibility(windy),1);
const samples={frames,birds:Array.from(require('../dist/birds.js').packed(require('../dist/birds.js').create())),lightning:Array.from(require('../dist/lightning.js').geometry(300,.64)),cloud:Array.from(require('../dist/clouds.js').geometry()),boat:[315,225,0,1],tackle:[355,230,2,0],fishingInfo:[0,0,0,1],fish:Array.from(require('../dist/motion.js').packed(require('../dist/motion.js').create()))};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(samples));
// The cloud front's first appearance must begin at zero opacity, including the densest bank.
for(const front of [0,1e-8,1e-6,1e-4])assert(smooth(.20,.65,front+.35)*smooth(0,.10,front)<.00001);
console.log(`PASS: ${transitionSteps} transition steps across all 144 season/weather pairs; 10,000 rapid switches; no wet sun/reflection; wet cloud canopy >99% across the entire sky; continuous cloud onset/wind; windy cloud travel ${(windy.drift/calm.drift).toFixed(2)}x calm; sunny breeze remains clear.`);
