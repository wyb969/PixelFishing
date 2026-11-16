'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Weather=require('../dist/weather.js'),Audio=require('../dist/thunder-audio.js');
let gameplay=null,journal=null;
let clock=0,raf=null,weather=null,maxActive=0,deferResume=false,resolvers=[];
class Param{setValueAtTime(){}cancelScheduledValues(){}setTargetAtTime(){}}
class Context{
 static instances=[];
 constructor(){this.state='suspended';this.sampleRate=8000;this.destination={};this.sources=[];this.resumes=0;Context.instances.push(this);}
 get currentTime(){return clock;}
 resume(){this.resumes++;if(deferResume)return new Promise(resolve=>resolvers.push(()=>{this.state='running';resolve();}));this.state='running';return Promise.resolve();}
 createBuffer(ch,n){const d=new Float32Array(n);return{getChannelData:()=>d};}
 createGain(){return{gain:new Param(),connect(){},disconnect(){}};}
 createBufferSource(){const s={connect(){},disconnect(){},start:t=>s.startTime=t,stop:t=>s.stopTime=t};this.sources.push(s);return s;}
 close(){this.state='closed';return Promise.resolve();}
}
const nodes=new Map(),handlers={},docHandlers={},motionHandlers={};let capturedFlash=0;
const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(p,k)=>k,uniform4f:(k,a,b)=>{if(k==='stormInfo')capturedFlash=b;}},{get:(o,k)=>k in o?o[k]:(...args)=>({})});
function node(id){if(!nodes.has(id)){const n={id,value:({height:'.18',speed:'.65',pixel:'3',weather:'auto',season:'auto'})[id]||'',checked:false,disabled:false,hidden:true,textContent:'',style:{},width:480,height:270,addEventListener(){},setAttribute(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:900,height:506.25}),getContext:()=>gl,querySelector:s=>node(id+s)};nodes.set(id,n);}return nodes.get(id);}
const document={hidden:false,querySelector:s=>node(s.slice(1)),addEventListener:(k,f)=>docHandlers[k]=f,body:{classList:{toggle:()=>false}},documentElement:{requestFullscreen:async()=>{}}};
const context={console,document,Math,Float32Array,Promise,setTimeout,clearTimeout,ResizeObserver:class{observe(){}},addEventListener:(k,f)=>handlers[k]=f,requestAnimationFrame:f=>raf=f,matchMedia:()=>({matches:false,addEventListener:(k,f)=>motionHandlers[k]=f}),fetch:async p=>({ok:true,text:async()=>fs.readFileSync(path.join(__dirname,'../dist',p),'utf8')}),SeaWeather:{...Weather,create:()=>weather=Weather.create()},SeaThunder:{create:()=>Audio.create({AudioContext:Context})}};
for(const [key,file]of [['SeaSpecies','species'],['SeaSeasons','seasons'],['SeaMotion','motion'],['SeaFishing','fishing'],['SeaClouds','clouds'],['SeaLightning','lightning'],['SeaBirds','birds']])context[key]=require('../dist/'+file+'.js');
const Motion=context.SeaMotion;context.SeaMotion={...Motion,create:()=>gameplay=Motion.create()};
context.SeaJournal={create:()=>{journal=require('../dist/journal.js').create({species:context.SeaSpecies.list,storage:null});return {...journal,mount(){}};}};
function frame(){clock+=.1;for(const ctx of Context.instances){for(const s of ctx.sources)if(!s.ended&&clock>=Math.min(s.stopTime??Infinity,(s.startTime??Infinity)+2.8)){s.ended=true;s.onended?.();}const active=ctx.sources.filter(s=>!s.ended&&s.startTime<=clock&&(s.stopTime??Infinity)>clock).length;maxActive=Math.max(maxActive,active);assert(active<=1,'overlapping thunder voices');}raf(clock*1000);}
function run(n){for(let i=0;i<n;i++)frame();}
function setWeather(value){node('weather').value=value;node('weather').onchange();}
function untilNewSource(){const ctx=Context.instances[0],before=ctx.sources.length;for(let i=0;i<700&&ctx.sources.length===before;i++)frame();assert(ctx.sources.length>before,'no new thunder scheduled');return ctx.sources.at(-1);}
(async()=>{
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/coast.js'),'utf8'),context);
 for(let i=0;i<20&&!raf;i++)await new Promise(r=>setImmediate(r));assert(raf,'scene did not initialize');
 assert.equal(node('lightning').checked,false);assert.equal(node('thunder-sound').checked,false);assert.equal(Context.instances.length,0);
 setWeather('5');run(300);assert.equal(weather.lightningId,0);assert.equal(capturedFlash,0);assert.equal(Context.instances.length,0);
 node('thunder-sound').checked=true;await node('thunder-sound').onchange();const ctx=Context.instances[0];let source=untilNewSource();run(35);assert.equal(maxActive,1,'no positive playback control');
 setWeather('3');assert(source.stopTime<=clock+.035);run(50);assert(source.ended);
 setWeather('5');node('lightning').checked=true;node('lightning').onchange();source=untilNewSource();node('lightning').checked=false;node('lightning').onchange();assert(source.stopTime<=clock+.035);frame();assert.equal(capturedFlash,0);
 node('lightning').checked=true;node('lightning').onchange();source=untilNewSource();node('pause').onclick({target:node('pause')});assert(source.stopTime<=clock+.035);const pausedCount=ctx.sources.length;run(250);assert.equal(ctx.sources.length,pausedCount);assert.equal(capturedFlash,0);node('pause').onclick({target:node('pause')});
 source=untilNewSource();document.hidden=true;docHandlers.visibilitychange();assert(source.stopTime<=clock+.035);run(50);assert.equal(capturedFlash,0);document.hidden=false;docHandlers.visibilitychange();
 source=untilNewSource();node('thunder-sound').checked=false;await node('thunder-sound').onchange();assert(source.stopTime<=clock+.035);run(60);
 node('thunder-sound').checked=true;await node('thunder-sound').onchange();source=untilNewSource();node('season').value='2';node('season').onchange();assert(source.stopTime<=clock+.035);
 for(let i=0;i<100;i++){setWeather(['0','5','3','5','2'][i%5]);frame();}assert(ctx.sources.filter(s=>!s.ended&&s.stopTime===undefined).length===0);
 node('season').value='1';node('season').onchange();setWeather('5');node('lightning').checked=true;node('lightning').onchange();source=untilNewSource();motionHandlers.change({matches:true});assert.equal(node('lightning').checked,false);assert(source.stopTime<=clock+.035);
 // Three fast UI toggles while resume promises resolve out of order must keep latest intent.
 await Audio.create({AudioContext:null}).setEnabled(false);ctx.state='suspended';deferResume=true;
 node('thunder-sound').checked=true;const first=node('thunder-sound').onchange();node('thunder-sound').checked=false;await node('thunder-sound').onchange();node('thunder-sound').checked=true;const latest=node('thunder-sound').onchange();
 resolvers.reverse().forEach(resolve=>resolve());await Promise.all([first,latest]);assert.equal(node('thunder-sound').checked,true);deferResume=false;
 node('season').value='3';node('season').onchange();run(150);assert(node('weather[value="5"]').disabled);assert.notEqual(weather.index,5);assert.equal(capturedFlash,0);
 const count=journal.snapshot().total;Object.assign(gameplay.fishing,{stage:4,age:2,duration:1,id:3});const previousCaught=gameplay.fishing.caught;for(let i=0;i<80&&gameplay.fishing.caught===previousCaught;i++){Object.assign(gameplay.fishing,{stage:4,age:2,duration:1,id:3});frame();}assert.equal(journal.snapshot().total,count+1);run(20);assert.equal(journal.snapshot().total,count+1,'coast double-counted catch display frames');
 console.log(`PASS: actual coast.js + audio integration: default silence/no flashes, opt-in unlock, weather/season/pause/hide/lightning/mute cancellation <=35ms, 100 rapid weather switches, late unlock race, reduced-motion disable, winter exclusion; max concurrent playing voices=${maxActive}. DOM/WebGL mocks, not a browser playback test.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
