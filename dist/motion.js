/* Deterministic steering shared by the browser and the offline interaction checks. */
(function(root){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const shore=x=>Math.floor((227+x*.087+Math.sin(x*.016)*2)/1.4)*1.4;
 function create(){return {boat:{x:315,y:225,targetX:315,targetY:225,vx:0,dir:1},fish:Array.from({length:14},(_,i)=>({x:185+(i*23)%280,y:233+(i%4)*3,vx:i%2?5:-5,vy:0,phase:i*1.7,age:i*.43}))};}
 function target(state,x,y){const b=state.boat;b.targetX=clamp(x,155,495);b.targetY=225;}
 function update(state,dt,t,fishDt=dt){
  const b=state.boat,old=b.x;const k=1-Math.exp(-dt*5);
  b.x+=(b.targetX-b.x)*k;b.y=225;
  b.vx=dt>0?(b.x-old)/dt:0;if(Math.abs(b.vx)>.5)b.dir=Math.sign(b.vx);
  state.fish.forEach((f,i)=>{
   f.age+=fishDt;const group=Math.floor(i/4),burst=Math.pow(Math.max(0,Math.sin(f.age*1.17+i*2.3)),8);
   const tx=310+Math.sin(f.age*.28+group*2.1)*115+Math.sin(f.age*.73+i)*17;
   const ty=234+group*2+Math.sin(f.age*.9+i*.7)*4;
   let ax=(tx-f.x)*.30,ay=(ty-f.y)*1.2;
   for(const other of state.fish){if(other===f)continue;const dx=f.x-other.x,dy=f.y-other.y,d=dx*dx+dy*dy;if(d>0&&d<90){ax+=dx*2.4/(d+1);ay+=dy*3.5/(d+1);}}
   const dx=f.x-b.x,dy=f.y-b.y,d=Math.hypot(dx,dy*2);
   if(d<37){const fear=(37-d)/37*(15+Math.min(30,Math.abs(b.vx)*.25));ax+=dx/(d+1)*fear;ay+=Math.max(1,dy)/(d+1)*fear;}
   f.vx+=(ax-f.vx)*(1-Math.exp(-fishDt*1.6));f.vy+=(ay-f.vy)*(1-Math.exp(-fishDt*2));
   f.x+=clamp(f.vx,-18,18)*fishDt*(1+burst*.65);f.y+=clamp(f.vy,-7,7)*fishDt;
   f.x=clamp(f.x,160,500);const bottom=shore(f.x)-4;
   f.y=clamp(f.y,227,bottom);f.phase+=fishDt*(5+Math.hypot(f.vx,f.vy)*.45+burst*5);
  });
 }
 function packed(state){return new Float32Array(state.fish.flatMap(f=>[f.x,f.y,Math.atan2(f.vy,f.vx),f.phase]));}
 const api={create,target,update,packed,shore};if(typeof module!=='undefined')module.exports=api;else root.SeaMotion=api;
})(typeof window==='undefined'?globalThis:window);
