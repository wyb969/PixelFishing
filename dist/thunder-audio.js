/* Opt-in, softly enveloped local thunder. No media downloads or autoplay attempt. */
(function(root){
'use strict';
const DURATION=2.8,MAX_GAIN=.16,MIN_GAP=8;
function synthesize(sampleRate,seed=1){
 const rate=Math.max(8000,Math.min(96000,Number(sampleRate)||44100));
 const data=new Float32Array(Math.ceil(rate*DURATION));
 let random=(Number(seed)>>>0)||1,low=0,body=0,dc=0,peak=0;
 const a=1-Math.exp(-2*Math.PI*95/rate),b=1-Math.exp(-2*Math.PI*420/rate),c=1-Math.exp(-2*Math.PI*24/rate);
 for(let i=0;i<data.length;i++){
  random=(Math.imul(random,1664525)+1013904223)>>>0;
  const white=random/2147483648-1;low+=(white-low)*a;body+=(white-body)*b;
  const rumble=low*.76+body*.24;dc+=(rumble-dc)*c;
  const t=i/rate,attack=Math.min(1,t/.20),release=Math.max(0,1-t/DURATION);
  const envelope=(attack*attack*(3-2*attack))*release*release*(.84+.16*Math.sin(t*7.5+.4));
  data[i]=(rumble-dc)*envelope;peak=Math.max(peak,Math.abs(data[i]));
 }
 // A strict PCM bound, then a separate quiet master gain. No transient crack.
 const scale=peak>0?.70/peak:0;for(let i=0;i<data.length;i++)data[i]*=scale;
 data[0]=0;data[data.length-1]=0;return data;
}
function create(options={}){
 const Context=Object.prototype.hasOwnProperty.call(options,'AudioContext')?options.AudioContext:(root.AudioContext||root.webkitAudioContext);
 let context=null,enabled=false,visible=options.visible!==false,disposed=false,revision=0,lastSeen=0,lastScheduled=-Infinity;
 const voices=new Set();
 function cancelPending(){
  if(!context)return;
  const now=context.currentTime;
  for(const voice of [...voices]){
   voices.delete(voice);
   try{voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.008);}catch(_){}
   // This also cancels sources scheduled to start after a light-to-thunder delay.
   try{voice.source.stop(now+.035);}catch(_){}
  }
 }
 async function setEnabled(value){
  const mine=++revision;
  enabled=false;
  if(!value||disposed||!visible||typeof Context!=='function'){cancelPending();return false;}
  try{
   // This call must be made directly inside the owner's click/change handler.
   // No other method creates/resumes a context or retries a blocked unlock.
   if(!context||context.state==='closed')context=new Context();
   if(context.state!=='running')await context.resume();
   if(mine!==revision||disposed||!visible||context.state!=='running')return false;
   enabled=true;return true;
  }catch(_){if(mine===revision)enabled=false;cancelPending();return false;}
 }
 function onStrike(id,delaySeconds=2){
  id=Number(id);
  if(!Number.isFinite(id)||id<=lastSeen||id<=0)return false;
  lastSeen=id; // Consume disabled/hidden strikes too: never replay them after enabling.
  if(!enabled||!visible||disposed||!context||context.state!=='running')return false;
  const now=context.currentTime;
  if(voices.size||now-lastScheduled<MIN_GAP)return false;
  const delay=Math.max(.3,Math.min(5,Number.isFinite(Number(delaySeconds))?Number(delaySeconds):2));
  try{
   const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*DURATION),context.sampleRate);
   buffer.getChannelData(0).set(synthesize(context.sampleRate,id*2654435761));
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=buffer;gain.gain.setValueAtTime(MAX_GAIN,now);
   source.connect(gain);gain.connect(context.destination);
   const voice={source,gain};voices.add(voice);
   source.onended=()=>{voices.delete(voice);try{source.disconnect();gain.disconnect();}catch(_){}};
   source.start(now+delay);lastScheduled=now;return true;
  }catch(_){cancelPending();return false;}
 }
 function setVisible(value){
  visible=Boolean(value);
  if(!visible){++revision;cancelPending();}
  // Becoming visible never calls resume(), and never replays an old strike.
 }
 function dispose(){
  if(disposed)return;disposed=true;enabled=false;++revision;cancelPending();
  if(context&&context.state!=='closed')try{const closing=context.close();if(closing&&closing.catch)closing.catch(()=>{});}catch(_){}
 }
 return {setEnabled,onStrike,cancelPending,setVisible,dispose};
}
const api={create,synthesize,DURATION,MAX_GAIN};
if(typeof module!=='undefined')module.exports=api;root.SeaThunder=api;
})(typeof globalThis!=='undefined'?globalThis:this);
