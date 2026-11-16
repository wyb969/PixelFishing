/* Continuous steering with species-dependent pace, depth and smooth visual turns. */
(function(root){
 'use strict';
 const Species=typeof module!=='undefined'?require('./species.js'):root.SeaSpecies;
 const Searchlight=typeof module!=='undefined'?require('./searchlight.js'):root.SeaSearchlight;
 const BOAT_SCALE=1.2;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const ease=(dt,tau)=>1-Math.exp(-dt/tau);
 const shore=x=>Math.floor((227+x*.087+Math.sin(x*.016)*2)/1.4)*1.4;
 // Float32 arithmetic mirrors the GLSL wave path closely for pointer hit testing.
 const F=Math.fround,fract=v=>v-Math.floor(v),mix=(a,b,t)=>F(F(a*F(1-t))+F(b*t));
 function waveHash(x,y){return fract(F(F(Math.sin(F(F(F(x)*F(127.1))+F(F(y)*F(311.7)))))*F(43758.5453)));}
 function waveNoise(x,y){
  x=F(x);y=F(y);const ix=Math.floor(x),iy=Math.floor(y);let fx=F(x-ix),fy=F(y-iy);
  fx=F(F(fx*fx)*F(3-F(2*fx)));fy=F(F(fy*fy)*F(3-F(2*fy)));
  return mix(mix(waveHash(ix,iy),waveHash(ix+1,iy),fx),mix(waveHash(ix,iy+1),waveHash(ix+1,iy+1),fx),fy);
 }
 function visualBoatY(state,time,strength){
  const x=F(state.boat.x),t=F(Number(time)||0),power=F(Math.max(0,Number(strength)||0));
  const a=F(Math.pow(F(.5+F(.5*F(Math.sin(F(F(F(x*F(.016))-F(t*F(.57)))+F(waveNoise(F(t*F(.07)),2)*3)))))),3));
  const b=F(Math.pow(F(.5+F(.5*F(Math.sin(F(F(F(x*F(.027))-F(t*F(.36)))+F(1.9)))))),5));
  const c=F(Math.pow(F(.5+F(.5*F(Math.sin(F(F(F(x*F(.009))-F(t*F(.21)))+4))))),2));
  const group=F(F(.28)+F(F(.72)*waveNoise(F(t*F(.105)),8)));
  const envelope=F(1-F(Math.exp(F(-F(F(F(F(a*F(.78))+F(b*F(.38)))+F(c*F(.25)))*group)*F(2.2)))));
  const ripple=waveNoise(F(F(x*F(.055))-F(t*F(.7))),F(t*F(.11)));
  const crest=F(F(224-F(power*F(2+F(33*envelope))))+F(F(F(ripple-.5)*power)*2));
  return F(F(crest+1)+F(F(Math.sin(F(t*F(.85))))*F(.35)));
 }
 function hitBoat(state,p,time,strength){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
  const x=(p.x-state.boat.x)/BOAT_SCALE;
  const y=(p.y-visualBoatY(state,time,strength)-(p.x-state.boat.x)*Math.sin((Number(time)||0)*.7)*.025)/BOAT_SCALE;
  return x>=-25&&x<=25&&y>=-24&&y<=8;
 }
 const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 function controlled(state,i){const a=state.fishing;return a&&a.id===i&&a.stage>=3&&a.stage<=6;}
 function create(){return {boat:{x:315,y:225,targetX:315,targetY:225,vx:0,dir:1},fish:Array.from({length:14},(_,i)=>{
  const species=Species.forFish(i),x=185+(i*23)%280,heading=i%2?0:Math.PI;
  return {x,y:clamp(231+species.depthOffset+(i%3)*.6,228,shore(x)-5),vx:Math.cos(heading)*species.speed*.45,vy:0,heading,phase:i*1.7,age:i*.43,species:i%6};
 })};}
 function target(state,x,y){const b=state.boat;b.targetX=clamp(x,155,495);b.targetY=225;}
 function update(state,dt,t,fishDt=dt,lightContext){
  dt=clamp(Number(dt)||0,0,.2);fishDt=clamp(Number(fishDt)||0,0,.2);
  const b=state.boat,old=b.x;
  b.x+=(b.targetX-b.x)*ease(dt,.2);b.y=225;
  b.vx=dt>0?(b.x-old)/dt:0;if(Math.abs(b.vx)>.5)b.dir=Math.sign(b.vx);
  state.searchlight=lightContext?Searchlight.frame(b,t,lightContext.dayTime,visualBoatY(state,t,lightContext.strength)):null;
  const light=state.searchlight,edges=Searchlight.edges(light,shore);
  state.fish.forEach((f,i)=>{
   // Fishing exclusively owns position, velocity and tail beat from chase to release.
   // packed() reads its final current-frame velocity, after Fishing.update has run.
   if(controlled(state,i)){
    if(Math.hypot(f.vx,f.vy)>.1)f.heading=Math.atan2(f.vy,f.vx);
    return;
   }
   if(fishDt===0)return;
   const species=Species.forFish(i);f.age+=fishDt;
   const burst=Math.pow(Math.max(0,Math.sin(f.age*.72+i*2.3)),8);
   let tx=318+Math.sin(f.age*(.085+species.speed*.002)+species.index*.94)*105+Math.sin(f.age*.37+i*.83)*15;
   let ty=clamp(231+species.depthOffset+Math.sin(f.age*.45+i*.91)*1.8,229,shore(f.x)-6);
   f.lightTarget=null;
   if(edges.length){
    // Each fish favors a different stretch of the same real contour. The slow
    // phase drift prevents an artificial static row without moving the field.
    const preferred=35+((i*47)%130)+Math.sin(f.age*.13+i)*8;
    let best=null,cost=Infinity;
    for(const edge of edges){
     const distance=Math.hypot(edge.x-f.x,edge.y-f.y);
     if(distance>145)continue;
     const score=Math.abs(edge.along-preferred)+distance*.13+(edge.side===(i%2?1:-1)?0:8);
     if(score<cost){cost=score;best=edge;}
    }
    if(best){const blend=light.power*.92;tx+=(best.x-tx)*blend;ty+=(best.y-ty)*blend;f.lightTarget={x:best.x,y:best.y,level:best.level};}
   }
   let desiredX=(tx-f.x)*.29,desiredY=(ty-f.y)*.90;
   for(let j=0;j<state.fish.length;j++){
    if(j===i)continue;const other=state.fish[j],dx=f.x-other.x,dy=f.y-other.y,d=dx*dx+dy*dy;
    if(d>0&&d<64){desiredX+=dx*3.0/(d+1);desiredY+=dy*4.0/(d+1);}
   }
   const dx=f.x-b.x,dy=f.y-b.y,d=Math.hypot(dx,dy*2);
   if(d<31){const fear=(31-d)/31*(10+Math.min(20,Math.abs(b.vx)*.2));desiredX+=dx/(d+1)*fear;desiredY+=Math.max(1,dy)/(d+1)*fear*.45;}
   // Anticipate the shore instead of hitting a clamp and instantly reversing.
   desiredX+=Math.max(0,179-f.x)*1.1-Math.max(0,f.x-481)*1.1;
   const bottom=shore(f.x)-4;
   desiredY+=Math.max(0,231-f.y)*2.5-Math.max(0,f.y-(bottom-4))*2.5;
   const limit=species.speed*(1+burst*.24);
   desiredX=clamp(desiredX,-limit,limit);desiredY=clamp(desiredY,-3.2,3.2);
   f.vx+=(desiredX-f.vx)*ease(fishDt,.65);f.vy+=(desiredY-f.vy)*ease(fishDt,.45);
   const headingTarget=Math.hypot(f.vx,f.vy)>.15?Math.atan2(f.vy,f.vx):f.heading;
   const turn=angleDelta(headingTarget,f.heading);f.heading+=clamp(turn,-fishDt*2.8,fishDt*2.8);
   // A turn slows the fish briefly before it accelerates in its new direction.
   const brake=.12+.88*Math.max(0,Math.cos(angleDelta(headingTarget,f.heading)));
   const oldX=f.x;f.x+=f.vx*fishDt*brake;f.y+=f.vy*fishDt*brake;
   // A caught fish may be released just outside the scene by Fishing. Let it swim
   // back through the edge rather than teleporting from 510 to 500 in one frame.
   f.x=clamp(f.x,Math.min(160,oldX),Math.max(500,oldX));
   f.y=clamp(f.y,227,shore(f.x)-4);
   f.phase+=fishDt*(3.8+Math.hypot(f.vx,f.vy)*.48+burst*3.5);
  });
 }
 function packed(state){return new Float32Array(state.fish.flatMap((f,i)=>[f.x,f.y,controlled(state,i)&&Math.hypot(f.vx,f.vy)>.1?Math.atan2(f.vy,f.vx):f.heading,f.phase]));}
 const api={create,target,update,packed,shore,visualBoatY,BOAT_SCALE,hitBoat};if(typeof module!=='undefined')module.exports=api;root.SeaMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
