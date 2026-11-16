/* Shared geometric light field. Coordinates and falloffs mirror common.glsl. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
 function frame(boat,time,dayTime,visualY){
  const dir=boat.dir<0?-1:1,phase=((dayTime/60+.25)%1+1)%1-.25;
  return {x:boat.x+.6*dir,y:visualY-19.2+.6*dir*Math.sin(time*.7)*.025,
   angle:.28+Math.sin(time*.18)*.045,power:1-smooth(-.10,.18,Math.sin(phase*Math.PI*2)),dir};
 }
 function field(light,p){
  const ax=light.dir*Math.cos(light.angle),ay=Math.sin(light.angle),dx=p.x-light.x,dy=p.y-light.y;
  const along=dx*ax+dy*ay,cross=dx*(-ay)+dy*ax,width=1.5+along*.10;
  const normalized=along<1||along>185?0:(1-smooth(width*.55,width,Math.abs(cross)))*(1-smooth(70,185,along));
  return {normalized,brightness:light.power*.7*normalized,along,cross};
 }
 // Invert the real field, then reject contours outside the playable water.
 // No shoreline clipping: that would produce targets that are not light edges.
 function edges(light,shore){
  if(!light||light.power<=0)return [];
  const ax=light.dir*Math.cos(light.angle),ay=Math.sin(light.angle),result=[];
  for(let j=0;j<42;j++){
   const along=12+j*4,level=.15+(j%5)*.025,range=1-smooth(70,185,along);
   if(range<level)continue;
   const width=1.5+along*.10;let lo=width*.55,hi=width;
   for(let k=0;k<15;k++){const mid=(lo+hi)*.5;if((1-smooth(width*.55,width,mid))*range>level)lo=mid;else hi=mid;}
   for(const side of [-1,1]){
    const cross=(lo+hi)*.5*side,x=light.x+along*ax-cross*ay,y=light.y+along*ay+cross*ax;
    if(x>=170&&x<=490&&y>=229&&y<=shore(x)-6)result.push({x,y,along,side,level});
   }
  }
  return result;
 }
 const api={frame,field,edges};if(typeof module!=='undefined')module.exports=api;root.SeaSearchlight=api;
})(typeof globalThis!=='undefined'?globalThis:this);
