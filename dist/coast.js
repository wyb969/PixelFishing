/* Reference-matched side view: layered WebGL water + advected point particles. */
(async()=>{
 'use strict';
 const canvas=document.querySelector('#sea'),error=document.querySelector('#error');
 function fail(message){error.hidden=false;error.textContent=message;}
 const gl=canvas.getContext('webgl',{antialias:false,alpha:false});
 if(!gl){fail('请启用浏览器硬件加速，以运行 WebGL 海岸。');return;}
 try{
 const names=['common.glsl','environment.frag','particles.vert','particles.frag','clouds.vert','clouds.frag','precipitation.frag','birds.glsl'];
 const [common,environment,particleVertex,particleFragment,cloudVertex,cloudFragment,precipitation,birdsShader]=await Promise.all(names.map(async name=>{const r=await fetch('shaders/'+name,{cache:'no-store'});if(!r.ok)throw Error('无法加载 '+name);return r.text();}));
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const u={};for(const k of ['resolution','time','dayTime','strength','pan','tilt','zoom','natureSeed','season','weather','weatherMotion','stormInfo','lightningSegments[0]','birdStates[0]','birdVisibility','windField','boat','boatLight','tackle','fishingInfo','fishStates[0]'])u[k]=gl.getUniformLocation(p,k);return{p,u};}
 const bg=program('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',common+birdsShader+environment);
 const points=program(common+particleVertex,particleFragment);
 const clouds=program(common+cloudVertex,common+cloudFragment);
 const rain=program('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',common+precipitation);
 const cloudData=SeaClouds.geometry(),cloudBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cloudBuffer);gl.bufferData(gl.ARRAY_BUFFER,cloudData,gl.STATIC_DRAW);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const data=[];
 for(let x=-70;x<550;x+=1.7)for(let j=0;j<23;j++)data.push(x,j/23,0);
 for(let x=-70;x<550;x+=6.8)for(let j=0;j<24;j++)data.push(x,j/24,1);
 for(let x=-70;x<550;x+=2.6)data.push(x,(Math.sin(x*127.1)*43758.5453)%1+1,2);
 const pointBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
 const height=document.querySelector('#height'),speed=document.querySelector('#speed'),pixel=document.querySelector('#pixel');
 let pan=0,tilt=0,zoom=1,drag=null,time=3,dayTime=7.5,last=null,paused=false,frames=0,stamp=0;
 const seasons=SeaSeasons.create(),weather=SeaWeather.create(),birds=SeaBirds.create();
 let boltGeometry=SeaLightning.geometry(weather.boltX,weather.boltSeed),lastBoltId=weather.lightningId,birdGeometry=SeaBirds.packed(birds);
 const weatherSelect=document.querySelector('#weather');
 const lightning=document.querySelector('#lightning'),sound=document.querySelector('#thunder-sound'),stormHelp=document.querySelector('#storm-help');
 const thunder=SeaThunder.create();
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 function cancelStormEffects(){weather.flash=0;weather.nextStrike=Infinity;weather.strikeAt=-100;thunder.cancelPending();}
 lightning.checked=false;sound.checked=false;let soundRequest=0;
 lightning.onchange=()=>{cancelStormEffects();};
 sound.onchange=async()=>{const request=++soundRequest,requested=sound.checked;const enabled=await thunder.setEnabled(requested);if(request!==soundRequest)return;sound.checked=enabled;stormHelp.textContent=requested&&!enabled?'声音未能启用，请再次点选；光效仍可独立使用':'光效与声音可分别开启，雷声会在闪电后延迟到达';};
 reducedMotion.addEventListener('change',e=>{if(e.matches){lightning.checked=false;cancelStormEffects();}});
 document.addEventListener('visibilitychange',()=>{thunder.setVisible(!document.hidden);if(document.hidden)cancelStormEffects();});
 weatherSelect.onchange=()=>{weather.mode=weatherSelect.value;cancelStormEffects();};
 document.querySelector('#weather-badge').onclick=()=>{const winter=seasons.weights.indexOf(Math.max(...seasons.weights))===3;const choices=winter?[0,1,2,4]:[0,1,2,3,5],current=weather.mode==='auto'?weather.index:Number(weather.mode);weather.mode=String(choices[(choices.indexOf(current)+1)%choices.length]);weatherSelect.value=weather.mode;cancelStormEffects();};
 const seasonSelect=document.querySelector('#season');
 seasonSelect.onchange=()=>{seasons.mode=seasonSelect.value;cancelStormEffects();};
 document.querySelector('#season-badge').onclick=()=>{const current=seasons.mode==='auto'?seasons.weights.indexOf(Math.max(...seasons.weights)):Number(seasons.mode);seasons.mode=String((current+1)%4);seasonSelect.value=seasons.mode;cancelStormEffects();};
 const natureSeed=Math.random()*1000;const motion=SeaMotion.create();motion.fishing=SeaFishing.create();const journal=SeaJournal.create();journal.mount(document.querySelector('#journal-host'));let journalCaught=0;let boatDrag=false,boatOffset={x:0,y:0};
 function resize(){const h=Math.round(810/Number(pixel.value));canvas.height=h;const rect=canvas.getBoundingClientRect();canvas.width=Math.round(h*rect.width/rect.height);gl.viewport(0,0,canvas.width,canvas.height);}
 for(const input of [height,speed,pixel])input.addEventListener('input',()=>{document.querySelector('#'+input.id+'Value').value=input.value;if(input===pixel)resize();});
 addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
 function bind(p){gl.useProgram(p.p);gl.uniform2f(p.u.resolution,canvas.width,canvas.height);gl.uniform1f(p.u.time,time);gl.uniform1f(p.u.dayTime,dayTime);gl.uniform1f(p.u.strength,+height.value*(1+weather.wind*.65));gl.uniform1f(p.u.pan,pan);gl.uniform1f(p.u.tilt,tilt);gl.uniform1f(p.u.zoom,zoom);gl.uniform1f(p.u.natureSeed,natureSeed);gl.uniform4fv(p.u.season,seasons.weights);gl.uniform4fv(p.u.weather,weather.values);gl.uniform2f(p.u.windField,weather.wind,weather.windTravel);gl.uniform4f(p.u.weatherMotion,weather.age,weather.drift,weather.windPhase,weather.snowCover);gl.uniform4f(p.u.stormInfo,weather.storm,lightning.checked&&!paused&&!document.hidden?weather.flash:0,weather.boltX,weather.boltSeed);gl.uniform4fv(p.u['lightningSegments[0]'],boltGeometry);gl.uniform4fv(p.u['birdStates[0]'],birdGeometry);gl.uniform1f(p.u.birdVisibility,SeaBirds.visibility(birds));const b=motion.boat;gl.uniform4f(p.u.boat,b.x,b.y,b.vx,b.dir);const light=motion.searchlight;gl.uniform4f(p.u.boatLight,light.x,light.y,light.angle,light.power);gl.uniform4fv(p.u['fishStates[0]'],SeaMotion.packed(motion));const f=motion.fishing;gl.uniform4fv(p.u.tackle,SeaFishing.packed(f));gl.uniform4f(p.u.fishingInfo,f.id,f.stage===4?f.tension:0,f.caught,f.dir);}
 function render(now){const elapsed=last===null?0:Math.max(0,(now-last)/1000);const dt=Math.min(elapsed,.1);last=now;SeaSeasons.update(seasons,dt);const winter=seasons.weights.indexOf(Math.max(...seasons.weights))===3;weatherSelect.querySelector('[value="4"]').disabled=!winter;weatherSelect.querySelector('[value="3"]').disabled=winter;weatherSelect.querySelector('[value="5"]').disabled=winter;if((weather.mode==='4'&&!winter)||((weather.mode==='3'||weather.mode==='5')&&winter)){weather.mode='auto';weatherSelect.value='auto';}weather.effectsEnabled=(lightning.checked||sound.checked)&&!paused&&!document.hidden;SeaWeather.update(weather,dt,seasons.weights);SeaBirds.update(birds,dt,weather,seasons.weights);birdGeometry=SeaBirds.packed(birds);if(weather.lightningId!==lastBoltId){lastBoltId=weather.lightningId;boltGeometry=SeaLightning.geometry(weather.boltX,weather.boltSeed);}if(weather.index!==5||!weather.effectsEnabled)thunder.cancelPending();else thunder.onStrike(weather.lightningId,weather.thunderDelay);const weatherBadge=document.querySelector('#weather-badge');weatherBadge.textContent=SeaWeather.label(weather)+(weather.mode==='auto'?' · 自动':' · 换天气');weatherBadge.setAttribute('aria-label','当前天气'+SeaWeather.label(weather)+'，点击切换');const seasonLabel=SeaSeasons.label(seasons);const badge=document.querySelector("#season-badge");badge.textContent=seasonLabel+" · "+(seasons.mode==="auto"?"四季流转":"点击换季");badge.setAttribute("aria-label","当前"+seasonLabel+"季，点击切换季节");dayTime=(dayTime+elapsed)%60;if(!paused)time+=dt*Number(speed.value)*(1+weather.wind*.35);
  SeaMotion.update(motion,dt,time,paused?0:dt*Number(speed.value),{dayTime,strength:+height.value*(1+weather.wind*.65)});motion.visualBoatY=SeaMotion.visualBoatY(motion,time,+height.value*(1+weather.wind*.65));motion.visualBoatTilt=Math.sin(time*.7)*.025;SeaFishing.update(motion,paused?0:dt);const f=motion.fishing;if(f.caught>journalCaught){journal.recordCatch(f.id%SeaSpecies.list.length,'catch:'+f.caught);journalCaught=f.caught;}const label=["准备再次抛投","抛出路亚","等待鱼追饵","鱼儿追饵","咬钩！拉锯中","收鱼成功","脱钩了，鱼儿逃走"][f.stage]+(f.stage===5?" · "+SeaSpecies.forFish(f.id).name:"")+" · 本次 "+f.caught+" 条";const status=document.querySelector("#fishing-status");if(status.textContent!==label)status.textContent=label;
  bind(bg);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const a=gl.getAttribLocation(bg.p,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(a);
  bind(clouds);gl.bindBuffer(gl.ARRAY_BUFFER,cloudBuffer);const cloudAttributes=[['center',2,0],['offset',2,8],['color',3,16]].map(([name,size,offset])=>{const loc=gl.getAttribLocation(clouds.p,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,offset);return loc;});gl.drawArrays(gl.TRIANGLES,0,cloudData.length/7);cloudAttributes.forEach(loc=>gl.disableVertexAttribArray(loc));
  bind(points);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);const b=gl.getAttribLocation(points.p,'particle');gl.enableVertexAttribArray(b);gl.vertexAttribPointer(b,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,data.length/3);gl.disableVertexAttribArray(b);
  if(weather.values[2]>.001||weather.values[3]*seasons.weights[3]>.001){
   bind(rain);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const r=gl.getAttribLocation(rain.p,'position');gl.enableVertexAttribArray(r);gl.vertexAttribPointer(r,2,gl.FLOAT,false,0,0);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);gl.disableVertexAttribArray(r);
  }
  frames++;if(now-stamp>1000){document.querySelector('#stats').textContent=Math.round(frames*1000/(now-stamp))+' FPS · '+String(Math.floor(((dayTime/60+.25)%1)*24)).padStart(2,'0')+':'+String(Math.floor((((dayTime/60+.25)%1)*24%1)*60)).padStart(2,'0');frames=0;stamp=now;}requestAnimationFrame(render);
 }
 function pointerWorld(e){const r=canvas.getBoundingClientRect(),w=270*canvas.width/canvas.height;return{x:((e.clientX-r.left)/r.width*w-w/2)/zoom+240+pan,y:((e.clientY-r.top)/r.height*270-210)/zoom+210+tilt};}
 function overBoat(p){return SeaMotion.hitBoat(motion,p,time,+height.value*(1+weather.wind*.65));}
 canvas.addEventListener('pointerdown',e=>{const p=pointerWorld(e);boatDrag=overBoat(p);if(boatDrag){boatOffset={x:motion.boat.x-p.x,y:motion.boat.y-p.y};}else if(!e.shiftKey&&p.y>211&&p.y<SeaMotion.shore(p.x)){SeaMotion.target(motion,p.x,p.y);boatOffset={x:0,y:0};boatDrag=true;}else drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{const p=pointerWorld(e);canvas.style.cursor=boatDrag?'grabbing':overBoat(p)?'grab':p.y>211&&p.y<SeaMotion.shore(p.x)?'pointer':'default';if(boatDrag){SeaMotion.target(motion,p.x+boatOffset.x,p.y+boatOffset.y);return;}if(!drag)return;pan=Math.max(-45,Math.min(45,pan-(e.clientX-drag[0])*.12));tilt=Math.max(-12,Math.min(12,tilt-(e.clientY-drag[1])*.08));drag=[e.clientX,e.clientY];});
 for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,()=>{drag=null;boatDrag=false;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.85,Math.min(1.4,zoom-e.deltaY*.0005));},{passive:false});
 const toggle=()=>{const hidden=document.body.classList.toggle('clean');document.querySelector('#settings').setAttribute('aria-expanded',String(!hidden));};
 document.querySelector('#hide').onclick=toggle;document.querySelector('#settings').onclick=toggle;
 addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')toggle();});
 document.querySelector('#pause').onclick=e=>{paused=!paused;cancelStormEffects();e.target.textContent=paused?'▶ 继续海浪':'Ⅱ 暂停海浪';};
 document.querySelector('#reset').onclick=()=>{pan=0;tilt=0;zoom=1;};
 document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){fail('无法进入全屏：'+e.message);}};
 requestAnimationFrame(render);
 }catch(e){fail('场景加载失败：'+e.message);console.error(e);}
})();




