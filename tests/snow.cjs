const assert=require('node:assert/strict'),fs=require('node:fs');
const Weather=require('../dist/weather.js'),Seasons=require('../dist/seasons.js');
const winter=[0,0,0,1],w=Weather.create();w.mode='0';
for(let i=0;i<30000;i++)Weather.update(w,.02,winter);
assert(Math.abs(w.snowCover-.65)<1e-6);
const frames=[];
function phase(name,mode,duration,seasonState){
 w.mode=mode;
 const samples=[0,5,15,30,60,120,180].filter(s=>s<=duration);
 let previous=w.snowCover;
 for(let i=0;i<=duration*50;i++){
  const seconds=i/50,season=seasonState?seasonState.weights:winter;
  if(samples.includes(seconds))frames.push({name,seconds,season:[...season],state:structuredClone(w)});
  if(seasonState)Seasons.update(seasonState,.02);
  Weather.update(w,.02,seasonState?seasonState.weights:winter);
  assert(w.snowCover>=0&&w.snowCover<=.95);
  assert(Math.abs(w.snowCover-previous)<.001,'accumulation/melt jumps');previous=w.snowCover;
 }
}
phase('accumulating','4',120);
assert(w.snowCover>.94);
phase('winter-melt','0',180);
assert(w.snowCover>.65&&w.snowCover<.66,'winter base lost or excess did not melt');
const summer=Seasons.create();summer.weights=[...winter];summer.phase=3;summer.mode='1';
phase('warm-melt','0',180,summer);
assert(w.snowCover<.001,'snow persists in summer');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(frames));
console.log('PASS: winter base .65; snowfall accumulates >.94; excess melts back to .65; smooth seasonal warming removes snow below .001; per-step cover change <.001.');
