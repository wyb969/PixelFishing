const assert=require('node:assert/strict'),fs=require('node:fs');const Weather=require('../dist/weather.js');
const summer=[0,1,0,0],winter=[0,0,0,1];
const off=Weather.create();off.mode='5';for(let i=0;i<30000;i++)Weather.update(off,.02,summer);
assert.equal(off.lightningId,0);assert.equal(off.flash,0);assert(off.storm>.99);
const w=Weather.create();w.mode='5';w.effectsEnabled=true;
const events=[],frames=[],transition=[];let lastId=0,maxFlash=0,firstStrike=null;
for(let i=0;i<=60000;i++){
 Weather.update(w,.01,summer);maxFlash=Math.max(maxFlash,w.flash);
 if(w.lightningId!==lastId){events.push(w.age);lastId=w.lightningId;if(firstStrike===null)firstStrike=w.age;assert(w.values[0]>.85&&w.values[2]>.30);}
 if(firstStrike!==null&&w.age-firstStrike<=2&&i%3===0)frames.push({seconds:w.age-firstStrike,state:structuredClone(w)});
 if([0,300,600,1000,1500,2500,4000,6000].includes(i))transition.push({seconds:i/100,state:structuredClone(w)});
 assert(w.flash>=0&&w.flash<=.42);
 if(w.age-w.strikeAt>.65)assert.equal(w.flash,0);
}
assert(events.length>20);for(let i=1;i<events.length;i++)assert(events[i]-events[i-1]>=14);
assert(maxFlash>.35&&maxFlash<=.42);
w.effectsEnabled=false;Weather.update(w,0,summer);assert.equal(w.flash,0);assert.equal(w.strikeAt,-100);
const id=w.lightningId;w.effectsEnabled=true;Weather.update(w,0,summer);assert.equal(w.flash,0);assert.equal(w.lightningId,id);assert(w.nextStrike-w.age>=5.5);
w.mode='0';Weather.update(w,0,summer);assert.equal(w.flash,0);assert.equal(w.nextStrike,Infinity);
const cold=Weather.create();cold.mode='5';cold.effectsEnabled=true;for(let i=0;i<15000;i++)Weather.update(cold,.02,winter);assert.equal(cold.index,4);assert.equal(cold.lightningId,0);assert(cold.values[2]<.001);
assert(!Weather.forecasts[3].includes(5));assert(Weather.forecasts[1].includes(5));
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({events,maxFlash,frames,transition}));
console.log(`PASS: default no effects for 600s; ${events.length} opt-in single-pulse strikes /600s; spacing >=14s; flash <=.42 and duration <=.65s; off/exit immediate; no replay on re-enable; winter excludes thunderstorms.`);
