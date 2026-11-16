/* Stable, connected stepped leaders. Geometry is built only when a strike starts. */
(function(root){
'use strict';
function geometry(x=270,seed=.5){
 let state=((seed*2147483647)>>>0)||1;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const anchors=[x,x+(random()-.5)*30,x+(random()-.5)*44,x+(random()-.5)*48,x+(random()-.5)*30];
 const startY=24+seed*25,points=[],segments=[];
 for(let i=0;i<=12;i++){
  const t=i/3,j=Math.min(3,Math.floor(t)),u=t-j;
  const px=anchors[j]*(1-u)+anchors[j+1]*u+(i%3?(random()-.5)*10:0);
  points.push([px,startY+(211-startY)*i/12]);
  if(i)segments.push(...points[i-1],...points[i]);
 }
 // Two shorter, dimmer offshoots remain attached to the main conductive channel.
 for(const [node,direction] of [[4,-1],[8,1]]){
  let a=points[node];
  for(let j=0;j<3;j++){
   const b=[a[0]+direction*(5+random()*7)+(random()-.5)*5,a[1]+7+random()*6];
   segments.push(...a,...b);a=b;
  }
 }
 return new Float32Array(segments);
}
const api={geometry};if(typeof module!=='undefined')module.exports=api;root.SeaLightning=api;
})(typeof globalThis!=='undefined'?globalThis:this);
