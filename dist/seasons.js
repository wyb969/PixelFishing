/* Slow seasonal clock; visual weights blend independently from the day/night clock. */
(function(root){
'use strict';
const names=['春','夏','秋','冬'];
function create(){return {phase:1,weights:[0,1,0,0],mode:'auto'};}
function update(state,dt){
 dt=Math.max(0,Math.min(Number(dt)||0,1));
 if(state.mode==='auto')state.phase=(state.phase+dt/120)%4;
 const phase=state.mode==='auto'?state.phase:Number(state.mode);
 const index=Math.floor(phase)%4, fraction=phase-Math.floor(phase);
 // Hold each season, then crossfade over the final 24 seconds.
 const t=Math.max(0,(fraction-.8)/.2), blend=t*t*(3-2*t);
 const target=[0,0,0,0];target[index]=1-blend;target[(index+1)%4]=blend;
 const ease=1-Math.exp(-dt/1.5);
 state.weights=state.weights.map((w,i)=>w+(target[i]-w)*ease);
 return state;
}
function label(state){const i=state.weights.indexOf(Math.max(...state.weights));return names[i];}
const api={create,update,label};if(typeof module!=='undefined')module.exports=api;root.SeaSeasons=api;
})(typeof globalThis!=='undefined'?globalThis:this);
