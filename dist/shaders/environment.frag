void main(){
 vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));float x=p.x,y=p.y;
 float skyHeight=clamp(y/211.,0.,1.);float day=daylight();float warm=dusk();
 vec3 nightSky=mix(vec3(.018,.028,.10),vec3(.08,.12,.27),skyHeight);
 vec3 blueSky=mix(vec3(.35,.62,.94),vec3(.57,.76,.99),skyHeight);
 blueSky+=season.x*vec3(.025,.025,-.012)+season.z*vec3(.065,.015,-.045)+season.w*vec3(.065,.015,-.055);
 blueSky=mix(blueSky,mix(vec3(.39,.51,.61),vec3(.64,.71,.73),skyHeight),weather.x*.75);
 vec3 color=mix(nightSky,blueSky,day);
 color=mix(color,mix(vec3(.36,.22,.43),vec3(1.,.53,.29),pow(skyHeight,2.)),warm*.85*(1.-weather.x*.65));
 vec4 canopy=cloudCanopy(p);color=mix(color,canopy.rgb,canopy.a);
 bool material=false;
 vec2 starCell=floor(p/3.);float star=hash(starCell);
 if(y<195.&&star>.994&&fract(p.x/3.)<.34&&fract(p.y/3.)<.34)color+=vec3(.6,.7,.9)*(1.-day)*solarVisibility()*(.7+.3*sin(fract(dayTime/60.)*125.6637+star*180.));
 vec2 sun=sunPosition();float sd=length(p-sun);
 vec3 skyBeforeSun=color;
 if(sunlight()>-.08){color+=vec3(1.,.60,.26)*exp(-sd*.045)*(.12+warm*.28);if(sd<8.)color=mix(vec3(1.,.63,.30),vec3(1.,.98,.79),smoothstep(0.,.4,sunlight()));}
 color=mix(skyBeforeSun,color,solarVisibility());
 vec2 moon=vec2(480.-sun.x,422.-sun.y);float md=length(p-moon);
 vec3 skyBeforeMoon=color;
 if(sunlight()<.05){color+=vec3(.13,.20,.36)*exp(-md*.08)*(1.-day);if(md<6.5)color=vec3(.79,.86,.91)*(1.-.13*noise(floor(p*.7)));}
 color=mix(skyBeforeMoon,color,solarVisibility());
 // A single distant stepped bolt belongs behind the coast, not on top of it.
 // Its light is shared by clouds, water, plants and boat through stormInfo.y.
 vec4 bolt=lightningLayer(p);color=mix(color,bolt.rgb,bolt.a);
 vec4 flock=birdsLayer(p);color=mix(color,flock.rgb,flock.a);
 // Distant coastal silhouettes, deliberately low-frequency and stepped.
 float ix=floor(x/3.)*3.;
 float hills=14.*exp(-pow((ix-25.)/52.,2.))*(.8+.13*sin(ix*.2)+.13*sin(ix*.43));
 float rock=20.*exp(-pow((ix-119.)/22.,2.))*(.75+.17*sin(ix*.15)+.12*sin(ix*.42));
 float islandTop=211.-max(hills,rock);
 if(y>islandTop&&y<214.&&x<173.){
  material=true;
  float n=noise(floor(p/2.)*.7);color=x<78.?vec3(.25,.40,.41):vec3(.16,.26,.43);
  if(n>.56)color+=x<78.?vec3(.13,.14,.02):vec3(.035,.035,.05);
  if(y>208.+noise(vec2(x*.04,2.))*3.)color=vec3(.52,.50,.39);
  // Moist air softens only the distant shore, not the foreground or interface.
  color=mix(color,vec3(.40,.46,.50),overcast()*.26);
  // Only the upper rock ridges catch snow; their dark silhouette stays legible.
  color=mix(color,vec3(.67,.75,.77),max(0.,weatherMotion.w-.35)*step(y-islandTop,1.6));
 }
 if(y>211.){
  material=true;
  color=seasonalWater(vec3(.36,.74,.80));
  if(y<213.)color=seasonalWater(vec3(.46,.82,.87));
  if(hash(floor(vec2(x*.6-time*.15,y)))>.984)color+=.12;
  color=mix(color,vec3(.35,.47,.52),overcast()*(1.-smoothstep(213.,220.,y))*.42);
 }
 float top=crest(x);float bottom=foot(x);float v=(y-top)/(bottom-top);
 if(v>=0.&&y>min(top,211.)){
  material=true;
  color=seaColor(clamp(v,0.,1.),x,y);
  float rip=noise(vec2(x*.63-time*.35-windField.y*5.,y*.78-time*1.1));
  if(v>.12&&rip>.75)color=mix(color,vec3(.20,.70,.70),.5);
  float jag=(hash(vec2(floor(x),floor(time*8.)))-.5)*1.8;
  if(y-top<.6+jag*.35)color=mix(color,vec3(.86,.98,.88),.25+smoothstep(.25,.8,strength)*.75);
  // A thin, irregular second wash at the toe of the breaking wave.
  float wash=bottom-3.+sin(x*.042+time*1.2)*1.5;
  if(abs(y-wash)<1.1&&rip>.37)color=vec3(.75,.94,.83);
 }
 // Fish swim in small schools below the wave surface, clipped by water and sand.
 if(y>max(214.,top+5.)&&y<shore(x)-2.){
  for(int i=0;i<14;i++){
   if(tackle.z==5.&&float(i)==fishingInfo.x)continue;
   float id=float(i);vec4 fishState=fishStates[i];vec2 delta=p-fishState.xy;
   float ca=cos(fishState.z),sa=sin(fishState.z);
   vec2 f=vec2(dot(delta,vec2(ca,sa)),dot(delta,vec2(-sa,ca)));
   if(abs(f.x)>9.||abs(f.y)>5.)continue;
   float size=.92+hash(vec2(id,4.))*.25;
   vec4 fish=fishLayer(f,mod(id,6.),fishState.w,size);
   if(fish.a>.5)color=mix(color,fish.rgb,.82);

  }
 }
 float beach=shore(x);
 if(y>beach){
  material=true;
  float d=y-beach;float n=noise(vec2(floor(x/3.),floor(y/2.)));
  color=vec3(.80,.64,.40);
  if(d>2.)color=vec3(.68,.49,.29);
  if(d>5.)color=vec3(.52,.37,.24);
  if(d>10.)color=vec3(.38,.29,.23);
  if(d>18.)color=vec3(.25,.25,.25);
  if(d>24.)color=vec3(.14,.21,.28);
  if(n>.65)color+=vec3(.025,.02,.015);
  color=seasonalSand(color);
  // Rain darkens sand near the surf; rain stops short of freezing the sea.
  color*=1.-weather.z*.22;
  // Wet sand picks up the overcast sky as a diffuse cool sheen, never a sun path.
  color=mix(color,color*vec3(.88,.98,1.10),weather.z*(1.-smoothstep(3.,12.,d))*.65);
  // Continuous snow shelves accumulate only above the wet tide line.
  float freshSnow=max(0.,weatherMotion.w-season.w*.65);
  color*=1.-freshSnow*(1.-weather.w)*.35;
  float snowEdge=6.+noise(vec2(floor(x/4.)*.18,2.))*3.-freshSnow*5.;
  float snow=weatherMotion.w*smoothstep(snowEdge,snowEdge+1.5,d)*(1.-smoothstep(22.,27.,d));
  // The wet tide edge stays clear; warmth leaves a small thawed patch by the fire.
  snow*=1.-campStrength()*exp(-length(p-campPosition())*.12)*.65;
  vec3 snowColor=mix(vec3(.70,.79,.81),vec3(.89,.92,.88),step(.42,n));
  color=mix(color,snowColor,snow);
  float cell=floor(x/31.),sx=cell*31.+6.+hash(vec2(cell,17.))*15.;
  float sy=shore(sx)+5.+hash(vec2(cell,18.))*7.;vec2 detail=p-vec2(sx,sy);
  // Small original shell marks, not imported sprites.
  float shell=step(dot(detail/vec2(1.8,1.0),detail/vec2(1.8,1.0)),1.);
  if(shell>.5)color=mix(color,vec3(.89,.79,.64)*(1.-weather.z*.15),season.y*(1.-snow));
  // A handful of dry leaves settle on the autumn strand.
  if(abs(detail.x+4.)+abs(detail.y-2.)<1.9)color=mix(color,vec3(.58,.32,.14),season.z*(1.-snow));
 }
 vec4 plant=vegetation(p);if(plant.a>.5){color=plant.rgb;material=true;}
 if(material){
  if(y>max(top,211.)&&y<beach&&plant.a<.5)color=illuminateWater(color,p);
  else {vec3 albedo=color;color=illuminate(albedo);if(y>=beach||plant.a>.5)color+=albedo*vec3(1.8,.75,.23)*campLight(p);}
 }
 // Broken sun/moon paths on water; width grows towards the viewer.
 if(y>211.&&y<beach&&y>top+1.){
  float lightX=sunlight()>0.?sun.x:moon.x;float spread=9.+(y-211.)*.8;
  float path=exp(-pow((x-lightX+sin(y*1.3+time*1.8)*6.)/spread,2.));
  float glint=step(.69,noise(vec2(x*.8+time*.9,y*1.7)));
  color+=path*glint*mix(vec3(.13,.22,.34),mix(vec3(.92,.43,.13),vec3(.65,.75,.57),smoothstep(.15,.6,sunlight())),day)*.5*solarVisibility();
 }
 // Searchlight volume lies behind boat/vegetation, never a full-screen wash.
 if(plant.a<.5&&y<beach&&y>178.)color+=vec3(.13,.16,.105)*boatSearchLight(p);
 // Original compact pixel yacht with shaded ivory hull and teal glazing.
 vec2 q=boatLocal(p);float mask=boatMask(q);
 if(y>boatY()+2.&&y<boatY()+6.&&abs(x-boat.x)<27.6)color=mix(color,illuminate(vec3(.22,.62,.67)),.35);
 if(y>boatY()+1.&&y<boatY()+4.&&abs(x-boat.x+boat.w*26.4)<8.+min(abs(boat.z)*.1,12.)){
  if(hash(floor(p+vec2(time*2.,0.)))>.65)color=mix(color,illuminate(vec3(.76,.91,.84)),min(.7,abs(boat.z)*.025));
 }
 if(mask>.5){
  vec3 hull=vec3(.89,.89,.77);
  if(q.y>0.)hull=vec3(.31,.52,.57);
  if(q.y>2.2)hull=vec3(.16,.29,.35);
  if(q.y>-1.4&&q.y<-.4)hull=vec3(.79,.38,.23);
  if(q.y<-4.)hull=vec3(.79,.83,.75);
  if(q.x>-11.5&&q.x<-.5&&q.y<-7.&&q.y>-11.5){hull=vec3(.14,.35,.43);if(abs(q.x+6.)<.6)hull=vec3(.76,.82,.74);if(q.y<-10.)hull+=vec3(.12,.19,.17);}
  if(q.y<-12.)hull=vec3(.91,.91,.79);
  if(q.x<-18.)hull=vec3(.22,.27,.31);
  if(q.x>3.&&q.y<-3.)hull=vec3(.77,.83,.80);
  if(q.x>6.&&q.x<13.&&q.y>-3.&&q.y<-1.8)hull=vec3(.59,.40,.24);
  if(abs(q.y+13.5)<.6&&q.x<2.)hull=mix(hull,vec3(.87,.92,.90),weatherMotion.w*.65);
  if(canopyMask(q)>.5){hull=vec3(.35,.50,.52);float roof=-14.-8.*canopyDeployment();if(abs(q.y-roof)<1.1){hull=mix(vec3(.26,.43,.48),vec3(.76,.77,.61),step(2.,mod(q.x+16.,6.)));hull=mix(hull,vec3(.82,.88,.86),weatherMotion.w*.60);}}
  color=illuminate(hull);
  // Window emission is applied after ambient lighting and survives dark weather.
  if(q.x>-11.5&&q.x<-.5&&q.y<-7.&&q.y>-11.5&&abs(q.x+6.)>.65)color=mix(color,vec3(.91,.59,.23),boatLampPower()*.80);
  if(q.x>-1.&&q.x<2.&&q.y<-14.&&q.y>-16.5)color=mix(color,vec3(.95,.92,.65),boatLampPower());
  // Two tiny navigation markers breathe slowly; never flash the whole scene.
  float markerPulse=.30+.70*pow(.5+.5*sin(weatherMotion.x*1.4),3.);
  float bowMarker=step(length(q-vec2(16.,-2.3)),.95);
  float sternMarker=step(length(q-vec2(-16.,-2.3)),.95);
  color=mix(color,vec3(.22,.88,.56)*markerPulse,bowMarker*boatLampPower());
  color=mix(color,vec3(.98,.30,.19)*markerPulse,sternMarker*boatLampPower());
 }
 vec4 angler=fishingLayer(p);if(angler.a>0.)color=mix(color,illuminate(angler.rgb),angler.a);
 // Emissive lure stays bright at night; nearby water/fish were lit from albedo above.
 if(tackle.z>=1.&&tackle.z<=4.){
  float distanceToLure=length(p-lurePosition());
  color+=vec3(.12,.29,.10)*exp(-distanceToLure*.65)*(1.-daylight());
  if(distanceToLure<1.25)color=mix(color,vec3(.86,1.,.50),1.-daylight());
 }
 // Foreground campfire and rising sparks; nighttime emission is not darkened again.
 vec2 fireDelta=p-campPosition();
 if(length(fireDelta)<45.){
  color+=vec3(.11,.028,.004)*campLight(p)*exp(-length(fireDelta)*.06);
  // Foreground grass occludes the fire's lower body, but its warm illumination
  // still reaches nearby materials; no full-screen overlay or cloudy dimming.
  float foregroundGrass=plant.a*step(campPosition().y-3.,y);
  vec4 fire=campLayer(p);color=mix(color,fire.rgb,fire.a*(1.-foregroundGrass));
 }
 // Depth-layered rain and snow are composited after the world in the final pass.
 // Autumn wind lifts only a few fallen leaves, never strips evergreen palms.
 if(season.z*weather.y>.01){for(int i=0;i<6;i++){float id=float(i),r=hash(vec2(id,91.));vec2 leaf=vec2(mod(r*570.+weatherMotion.x*2.+windField.y*10.,550.)-35.,218.+r*28.+sin(weatherMotion.x+id)*3.);float leafDot=step(abs(p.x-leaf.x),.8)*step(abs(p.y-leaf.y),.55);color=mix(color,illuminate(vec3(.68,.43,.19)),leafDot*season.z*weather.y);}}
 // Rain rings appear only on water and wet sand; two pixels wide and low contrast.
 if(weather.z>.01&&y>max(214.,top+2.)&&y<beach+4.){
  vec2 cell=floor(p/vec2(16.,7.));float seed=hash(cell),age=fract(weatherMotion.x*1.8+seed*7.);
  vec2 center=(cell+vec2(seed,.5))*vec2(16.,7.);float ring=abs(length((p-center)*vec2(1.,2.))-(.7+age*2.));
  float splash=step(ring,.28)*(1.-age)*step(.55,seed);
  color+=illuminate(vec3(.12,.16,.16))*splash*weather.z;
 }
 gl_FragColor=vec4(color,1.);
}


