/* Small independent flight paths projected into the coastal diorama. */
(function(root){
'use strict';
const random=n=>{const v=Math.sin(n*127.1+17.3)*43758.5453;return v-Math.floor(v);};
const ease=(dt,tau)=>1-Math.exp(-dt/tau);
const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
function project(b,escape){
 const u=b.flight,depth=u*(3.6+b.depthVariation),perspective=1/(1+depth);
 const worldX=b.launchX+u*b.travel;
 const flutter=Math.sin(b.phase*.21+b.id)*1.6+Math.sin(b.phase*.095+b.id*2.1)*1.2;
 // Both coordinates converge on a distant, individual vanishing point. Slower
 // screen motion and a smaller silhouette come from the same depth, not a scale trick.
 b.x=b.vanishX+(worldX-b.vanishX)*perspective+b.scatterX*escape*perspective;
 b.y=b.vanishY+(b.launchY-b.vanishY)*perspective+flutter*perspective-b.scatterY*escape*perspective;
 const terminal=1-smooth(.76,1,u);
 b.scale=1.60*perspective*terminal;
}
function create(){
 const birds=Array.from({length:9},(_,id)=>{
  const b={id,flight:.07+random(id+31)*.60,phase:random(id+53)*Math.PI*2,duration:72+random(id+7)*44,
   launchX:-185-random(id+11)*35,launchY:58+random(id+13)*91,vanishX:190+random(id+17)*335,vanishY:174+random(id+19)*19,
   depthVariation:random(id+23)*1.8,travel:70+random(id+29)*105,scatterX:(random(id+37)-.5)*90,scatterY:10+random(id+41)*25,
   flapRate:4.2+random(id+43)*3.0,x:0,y:0,scale:0,cycles:0};
  project(b,0);return b;
 });
 return {birds,visible:1,escape:0,age:0};
}
function update(state,dt,weather,seasonWeights){
 dt=Math.max(0,Math.min(.1,Number(dt)||0));state.age+=dt;
 const cover=weather&&weather.values?weather.values[0]:0;
 const index=weather&&Number.isFinite(weather.index)?weather.index:0;
 const cloudy=(index!==0&&index!==2)||cover>.38;
 state.visible+=((cloudy?0:1)-state.visible)*ease(dt,cloudy?.75:6);
 state.escape+=((cloudy?1:0)-state.escape)*ease(dt,.65);
 const wind=Math.max(0,Math.min(1,Number(weather&&weather.wind)||0));
 for(const b of state.birds){
  b.phase=(b.phase+dt*b.flapRate)%6283.185307179586;
  b.flight+=dt*((1+wind*.12)/b.duration+state.escape*(.045+random(b.id+47)*.025));
  // The terminal silhouette has already shrunk/faded to zero before re-entry at
  // x<-185, beyond even the widest permitted camera view. No visible wrapping.
  if(b.flight>=1){b.flight%=1;b.cycles++;}
  project(b,state.escape);
 }
 return state;
}
function packed(state){return new Float32Array(state.birds.flatMap(b=>[b.x,b.y,b.scale,b.phase]));}
function visibility(state){return Math.max(0,Math.min(1,state.visible));}
const api={create,update,packed,visibility};if(typeof module!=='undefined')module.exports=api;root.SeaBirds=api;
})(typeof globalThis!=='undefined'?globalThis:this);
