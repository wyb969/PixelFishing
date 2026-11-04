(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(){return{stage:1,age:0,wait:0,id:-1,x:350,y:232,dir:1,caught:0,escaped:0,tension:0,duration:8,startX:0,startY:0};}
 function update(s,dt,random=Math.random){
  const a=s.fishing,b=s.boat;if(!dt)return;a.age+=dt;
  const enter=stage=>{a.stage=stage;a.age=0;};
  const waterY=x=>Math.min(236,Math.floor((227+x*.087+Math.sin(x*.016)*2)/1.4)*1.4-5);
  if(a.stage===0){if(a.age>3){a.id=-1;a.dir=b.x>390?-1:1;enter(1);}return;}
  if(a.stage===1){
   a.dir=b.x>390?-1:1;const v=clamp(a.age/1.7,0,1);const end=clamp(b.x+a.dir*60,175,480);
   a.x=b.x+a.dir*22+(end-b.x-a.dir*22)*v;a.y=b.y-19+(waterY(end)-(b.y-19))*v-Math.sin(v*Math.PI)*24;
   if(v===1){a.wait=3+random()*6;enter(2);}return;
  }
  if(a.stage===2){a.x=clamp(b.x+a.dir*56+Math.sin(a.age*1.3)*3,175,480);a.y=waterY(a.x)+Math.sin(a.age*2)*.6;
   if(a.age>a.wait){a.id=s.fish.reduce((best,f,i)=>Math.hypot(f.x-a.x,f.y-a.y)<Math.hypot(s.fish[best].x-a.x,s.fish[best].y-a.y)?i:best,0);enter(3);}return;
  }
  const f=s.fish[a.id];if(!f){enter(0);return;}
  if(a.stage===3){const dx=a.x-f.x,dy=a.y-f.y;f.vx=dx*3;f.vy=dy*3;f.x+=dx*(1-Math.exp(-dt*3));f.y+=dy*(1-Math.exp(-dt*3));f.phase+=dt*16;
   if(Math.hypot(dx,dy)<2||a.age>4){a.duration=6+random()*4;a.startX=f.x;a.startY=f.y;a.x=f.x;a.y=f.y;enter(4);}return;
  }
  if(a.stage===4){
   const p=clamp(a.age/a.duration,0,1),run=Math.sin(a.age*3.1)+.45*Math.sin(a.age*7.3);
   const distance=17+(1-p)*40+run*10;const tx=clamp(b.x+a.dir*distance,170,490);
   const ty=clamp(waterY(tx)+Math.sin(a.age*4.7)*3.5,227,waterY(tx)+2);
   const dx=tx-f.x,dy=ty-f.y;f.vx=dx*6;f.vy=dy*6;f.x+=dx*(1-Math.exp(-dt*6));f.y+=dy*(1-Math.exp(-dt*6));f.phase+=dt*24;
   a.x=f.x;a.y=f.y;a.tension=.5+.5*Math.sin(a.age*3.1);if(p===1){a.startX=f.x;a.startY=f.y;if(random()<.5){a.caught++;enter(5);}else{a.escaped++;enter(6);}}return;
  }
  if(a.stage===5){const p=clamp(a.age/2,0,1);a.x=a.startX+(b.x+6-a.startX)*p;a.y=a.startY+(b.y-5-a.startY)*p-Math.sin(p*Math.PI)*14;f.x=a.x;f.y=a.y;
   if(a.age>4){f.x=510;f.y=245;f.vx=-12;a.id=-1;enter(0);}return;
  }
  if(a.stage===6){f.x=clamp(f.x+a.dir*dt*22,160,500);f.y=clamp(f.y+Math.sin(a.age*8)*dt*5,227,waterY(f.x)+2);f.vx=a.dir*22;f.phase+=dt*22;
   a.x=b.x+a.dir*24;a.y=b.y-15;if(a.age>2.5){a.id=-1;enter(0);}}
 }
 function packed(a){return [a.x,a.y,a.stage,a.age];}
 const api={create,update,packed};if(typeof module!=='undefined')module.exports=api;else root.SeaFishing=api;
})(typeof window==='undefined'?globalThis:window);

