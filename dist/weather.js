/* Coastal weather fronts: cloud first, precipitation second; continuous shared wind. */
(function(root){
'use strict';
const names=['晴','多云','海风','雨','雪','雷阵雨'];
const presets=[[0,.12,0,0],[.65,.22,0,0],[.18,.9,0,0],[.92,.62,.85,0],[.88,.32,0,.85],[.99,.95,1,0]];
const forecasts=[[0,1,3,2],[0,2,5,3],[2,1,3,0],[4,1,4,0]];
const ease=(dt,tau)=>1-Math.exp(-dt/tau);
const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
const random=n=>{const v=Math.sin(n*127.1+41.7)*43758.5453;return v-Math.floor(v);};
function create(){return {mode:'auto',age:0,drift:0,windPhase:0,windTravel:0,wind:.12,values:[...presets[0]],snowCover:0,index:0,transitioning:false,storm:0,effectsEnabled:false,flash:0,lightningId:0,strikeAt:-100,nextStrike:Infinity,boltX:270,boltSeed:0,thunderDelay:2};}
function update(w,dt,season){
 dt=Math.max(0,Math.min(1,Number(dt)||0));w.age+=dt;
 const s=season.indexOf(Math.max(...season));
 w.index=w.mode==='auto'?forecasts[s][Math.floor(w.age/50)%4]:Number(w.mode);
 if(w.index===4&&s!==3)w.index=1;
 if((w.index===3||w.index===5)&&s===3)w.index=4;
 if(!Number.isInteger(w.index)||w.index<0||w.index>=presets.length)w.index=0;
 const target=presets[w.index],wetTarget=target[2]+target[3];
 // Clearing waits until the last drops/flakes fade, so the sun never leaks through rain.
 const lingering=w.values[2]+w.values[3]>.008;
 const coverTarget=wetTarget>0?target[0]:lingering?Math.max(.76,target[0]):target[0];
 w.values[0]+=(coverTarget-w.values[0])*ease(dt,wetTarget>0?4.5:7);
 w.values[1]+=(target[1]-w.values[1])*ease(dt,5);
 // Fade the solar disc out before precipitation starts. A front takes ~7 seconds to arrive.
 const ready=Math.max(0,Math.min(1,(w.values[0]-.72)/.12));
 for(let i=2;i<4;i++){const next=target[i]*ready;w.values[i]+=(next-w.values[i])*ease(dt,next>w.values[i]?3.5:1.8);}
 // One rightward wind with shared smooth gusts; all movement integrates speed, never time*changingSpeed.
 const gust=.80+.14*Math.sin(w.age*.55)+.06*Math.sin(w.age*1.17+.4);
 w.wind=w.values[1]*gust;w.windTravel+=dt*w.wind;
 w.drift+=dt*(.3+w.wind*6.2);w.windPhase+=dt*(.55+w.wind*.6);
 // Winter retains its seasonal base; new snow accumulates, then melts slowly back
 // to that base. A warm season removes the remaining snow rather than snapping it off.
 const cover=Math.min(.95,season[3]*(.65+w.values[3]*.4));
 const snowTau=cover>w.snowCover?18:24+season[3]*21;
 w.snowCover+=(cover-w.snowCover)*ease(dt,snowTau);
 w.storm+=((w.index===5?1:0)-w.storm)*ease(dt,6);
 // Optional light/sound effects have no surprise autoplay. One soft pulse per
 // strike, at least 14 seconds apart; no strobing, burst trains, or catch-up events.
 if(w.effectsEnabled&&w.index===5&&w.values[0]>.85&&w.values[2]>.30){
  if(!Number.isFinite(w.nextStrike))w.nextStrike=w.age+5.5;
  if(w.age>=w.nextStrike){
   w.lightningId++;w.strikeAt=w.age;w.boltSeed=random(w.lightningId);
   w.boltX=100+w.boltSeed*310;w.thunderDelay=1.3+random(w.lightningId+17)*1.7;
   w.nextStrike=w.age+14+random(w.lightningId+31)*8;
  }
  const t=w.age-w.strikeAt;
  w.flash=.42*smooth(0,.075,t)*(1-smooth(.12,.65,t))*w.storm;
 }else{w.flash=0;w.nextStrike=Infinity;w.strikeAt=-100;}
 w.transitioning=target.some((v,i)=>Math.abs(w.values[i]-v)>.045);
 return w;
}
function label(w){return (w.transitioning?'渐转':'')+names[w.index];}
const api={create,update,label,presets,forecasts};if(typeof module!=='undefined')module.exports=api;root.SeaWeather=api;
})(typeof globalThis!=='undefined'?globalThis:this);
