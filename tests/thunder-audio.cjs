'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Thunder=require('../dist/thunder-audio.js');
class Param{constructor(){this.events=[];}setValueAtTime(v,t){this.events.push(['set',v,t]);}cancelScheduledValues(t){this.events.push(['cancel',t]);}setTargetAtTime(v,t,tau){this.events.push(['target',v,t,tau]);}}
class Context{
 static instances=[];
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=22050;this.destination={};this.sources=[];this.gains=[];this.resumes=0;Context.instances.push(this);}
 async resume(){this.resumes++;this.state='running';}
 createBuffer(ch,n,rate){const data=new Float32Array(n);return {getChannelData:()=>data,sampleRate:rate};}
 createBufferSource(){const source={connect(){},disconnect(){},start:t=>{source.started=t;},stop:t=>{source.stopped=t;source.onended?.();}};this.sources.push(source);return source;}
 createGain(){const gain={gain:new Param(),connect(){},disconnect(){}};this.gains.push(gain);return gain;}
 async close(){this.state='closed';}
}
(async()=>{
 const audio=Thunder.create({AudioContext:Context});
 assert.equal(Context.instances.length,0);assert.equal(audio.onStrike(1,2),false);assert.equal(Context.instances.length,0);
 assert.equal(await audio.setEnabled(true),true);const ctx=Context.instances[0];assert.equal(ctx.resumes,1);
 assert.equal(audio.onStrike(1,2),false,'disabled strike replayed');assert.equal(audio.onStrike(2,2),true);assert.equal(ctx.sources[0].started,2);
 assert.equal(audio.onStrike(2,2),false,'duplicate strike');assert.equal(audio.onStrike(3,2),false,'overlap');
 assert.equal(await audio.setEnabled(false),false);assert(ctx.sources[0].stopped<=.035);assert.equal(audio.onStrike(4,1),false);
 assert.equal(await audio.setEnabled(true),true);assert.equal(audio.onStrike(4,1),false,'old strike replayed');
 ctx.currentTime=9;assert(audio.onStrike(5,1));audio.cancelPending();assert(ctx.sources[1].stopped<=9.035);
 ctx.currentTime=18;assert(audio.onStrike(6,1));audio.setVisible(false);assert(ctx.sources[2].stopped<=18.035);assert.equal(audio.onStrike(7,1),false);
 audio.setVisible(true);assert.equal(ctx.resumes,1);assert.equal(audio.onStrike(7,1),false);ctx.currentTime=27;assert(audio.onStrike(8,0));assert.equal(ctx.sources[3].started,27.3);
 ctx.currentTime=28;audio.cancelPending();assert.equal(audio.onStrike(9,1),false,'minimum gap');
 ctx.state='suspended';ctx.currentTime=40;assert.equal(audio.onStrike(10,1),false);assert.equal(ctx.resumes,1,'automatic resume');
 assert.equal(await audio.setEnabled(true),true);assert.equal(ctx.resumes,2);assert.equal(audio.onStrike(10,1),false);
 ctx.currentTime=50;assert(audio.onStrike(11,99));assert.equal(ctx.sources.at(-1).started,55);audio.dispose();assert.equal(ctx.state,'closed');assert.equal(await audio.setEnabled(true),false);
 for(const gain of ctx.gains)for(const event of gain.gain.events)if(event[0]==='set')assert(event[1]<=.16);
 assert.equal(await Thunder.create({AudioContext:null}).setEnabled(true),false);
 class Denied extends Context{async resume(){throw new Error('NotAllowedError');}}
 const denied=Thunder.create({AudioContext:Denied});assert.equal(await denied.setEnabled(true),false);assert.equal(denied.onStrike(1),false);
 let unlock;class Slow extends Context{resume(){return new Promise(resolve=>{unlock=()=>{this.state='running';resolve();};});}}
 const race=Thunder.create({AudioContext:Slow});const pending=race.setEnabled(true);await race.setEnabled(false);unlock();assert.equal(await pending,false);assert.equal(race.onStrike(1),false,'late resume overrode mute');
 const hidden=Thunder.create({AudioContext:Slow});const pendingHidden=hidden.setEnabled(true);hidden.setVisible(false);unlock();assert.equal(await pendingHidden,false);hidden.setVisible(true);assert.equal(hidden.onStrike(1),false);
 // Stress with a clock-aware source mock: stop() is scheduled, not instant,
 // and natural source completion invokes onended only when the clock reaches it.
 class TimedContext extends Context{
  createBufferSource(){
   const source={ended:false,connect(){},disconnect(){},start:t=>{source.started=t;},stop:t=>{source.stopped=t;}};
   this.sources.push(source);return source;
  }
  finishTime(source){return Math.min(source.stopped??Infinity,(source.started??Infinity)+(source.buffer?.getChannelData(0).length??0)/this.sampleRate);}
  advanceTo(t){
   assert(t>=this.currentTime);this.currentTime=t;
   for(const source of this.sources)if(!source.ended&&this.finishTime(source)<=t){source.ended=true;source.onended?.();}
   assert(this.audibleCount()<=1,'more than one audible source');
  }
  audibleCount(){return this.sources.filter(s=>s.started<=this.currentTime&&this.currentTime<this.finishTime(s)).length;}
 }
 const stress=Thunder.create({AudioContext:TimedContext});assert(await stress.setEnabled(true));
 const stressContext=Context.instances.at(-1);let stressId=0,accepted=0;
 for(let i=0;i<100;i++)accepted+=Number(stress.onStrike(++stressId,2));
 assert.equal(accepted,1,'100-strike burst scheduled overlapping thunder');
 assert.equal(stressContext.sources.length,1);stressContext.advanceTo(2.1);assert.equal(stressContext.audibleCount(),1);
 // 100 rapid mute/unmute/cancel cycles during an audible rumble, each with a fresh event.
 const cancelAt=stressContext.currentTime;
 for(let i=0;i<100;i++){
  await stress.setEnabled(false);stress.cancelPending();assert(await stress.setEnabled(true));
  assert.equal(stress.onStrike(++stressId,.3),false,'toggle bypassed rate/overlap protection');
  stressContext.advanceTo(2.1+i*.001);
 }
 assert(stressContext.sources[0].stopped<=cancelAt+.035+1e-9);
 stressContext.advanceTo(2.21);assert.equal(stressContext.audibleCount(),0);
 assert.equal(stressContext.sources.length,1,'rapid toggles created queued sounds');
 const consumed=stressId;assert.equal(stress.onStrike(consumed,2),false,'consumed rapid event replayed');
 // New events after the quiet interval remain supported; cancel every scheduled
 // future rumble before onset, with 100 repeated cancellation calls per event.
 for(let cycle=0;cycle<10;cycle++){
  stressContext.advanceTo(12+cycle*10);assert(stress.onStrike(++stressId,5));
  const source=stressContext.sources.at(-1),at=stressContext.currentTime;
  for(let i=0;i<100;i++)stress.cancelPending();
  assert(source.stopped<=at+.035+1e-9);assert(source.stopped<source.started);
  stressContext.advanceTo(at+9);assert.equal(stressContext.audibleCount(),0);
 }
 const endpoints=[];
 for(const source of stressContext.sources){
  const end=stressContext.finishTime(source);
  if(source.started<end){endpoints.push([source.started,1],[end,-1]);}
 }
 endpoints.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let active=0,maximum=0;
 for(const [,delta] of endpoints){active+=delta;maximum=Math.max(maximum,active);assert(active<=1);}
 assert.equal(maximum,1,'stress test never exercised audible playback');stress.dispose();
 // 100 in-flight user unlocks that resolve late and in reverse order must not
 // override later mutes or resurrect the strike events observed while disabled.
 const lateResolutions=[];
 class DeferredContext extends Context{
  resume(){this.resumes++;return new Promise(resolve=>lateResolutions.push(()=>{this.state='running';resolve();}));}
 }
 const late=Thunder.create({AudioContext:DeferredContext}),lateRequests=[];
 for(let i=1;i<=100;i++){
  lateRequests.push(late.setEnabled(true));assert.equal(late.onStrike(i,1),false);await late.setEnabled(false);
 }
 const lateContext=Context.instances.at(-1);assert.equal(lateContext.sources.length,0);
 for(const resolve of lateResolutions.reverse())resolve();
 assert((await Promise.all(lateRequests)).every(value=>value===false));
 assert.equal(late.onStrike(101,1),false,'late unlock undid final mute');assert.equal(lateContext.sources.length,0);
 assert(await late.setEnabled(true));assert.equal(late.onStrike(100,1),false);assert.equal(late.onStrike(101,1),false);
 assert(late.onStrike(102,1),'fresh explicitly unlocked event failed');late.cancelPending();late.dispose();
 const data=Thunder.synthesize(44100,42);let peak=0,sum=0;for(const x of data){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x)*Thunder.MAX_GAIN);sum+=(x*Thunder.MAX_GAIN)**2;}
 assert.equal(data.length,123480);assert.equal(data[0],0);assert.equal(data.at(-1),0);assert(peak<=.112001);const rms=Math.sqrt(sum/data.length);assert(rms>.005&&rms<.05);
 const rmsRange=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=data[i]**2;return Math.sqrt(s/(b-a))*Thunder.MAX_GAIN;};
 assert(rmsRange(0,441)<rmsRange(4410,8820));assert(rmsRange(data.length-441,data.length)<.00001);
 if(process.argv[2]){
  const target=path.resolve(process.argv[2]);fs.mkdirSync(path.dirname(target),{recursive:true});const wav=Buffer.alloc(44+data.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length*2,40);data.forEach((x,i)=>wav.writeInt16LE(Math.round(x*Thunder.MAX_GAIN*32767),44+i*2));fs.writeFileSync(target,wav);
 }
 console.log(`PASS: opt-in context/unlock, refusal/unsupported/race handling, no historical or duplicate strikes, overlap/rate limits, mute/hide/cancel/dispose, no automatic resume; 2.8s PCM peak=${peak.toFixed(4)}, RMS=${rms.toFixed(4)}, smooth attack/tail; 100-strike burst, 100 rapid toggle cycles, 1,000 repeated cancellations, 100 reversed late unlocks: at most one audible source, all cancellations within 35ms, no queued replay. Browser/device playback not tested.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
