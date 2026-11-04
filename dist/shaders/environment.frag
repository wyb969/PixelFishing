void main(){
 vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));float x=p.x,y=p.y;
 float skyHeight=clamp(y/211.,0.,1.);float day=daylight();float warm=dusk();
 vec3 nightSky=mix(vec3(.018,.028,.10),vec3(.08,.12,.27),skyHeight);
 vec3 blueSky=mix(vec3(.35,.62,.94),vec3(.57,.76,.99),skyHeight);
 vec3 color=mix(nightSky,blueSky,day);
 color=mix(color,mix(vec3(.36,.22,.43),vec3(1.,.53,.29),pow(skyHeight,2.)),warm*.85);
 bool material=false;
 vec2 starCell=floor(p/3.);float star=hash(starCell);
 if(y<195.&&star>.994&&fract(p.x/3.)<.34&&fract(p.y/3.)<.34)color+=vec3(.6,.7,.9)*(1.-day)*(.7+.3*sin(fract(dayTime/60.)*125.6637+star*180.));
 vec2 sun=sunPosition();float sd=length(p-sun);
 if(sunlight()>-.08){color+=vec3(1.,.60,.26)*exp(-sd*.045)*(.12+warm*.28);if(sd<8.)color=mix(vec3(1.,.63,.30),vec3(1.,.98,.79),smoothstep(0.,.4,sunlight()));}
 vec2 moon=vec2(480.-sun.x,422.-sun.y);float md=length(p-moon);
 if(sunlight()<.05){color+=vec3(.13,.20,.36)*exp(-md*.08)*(1.-day);if(md<6.5)color=vec3(.79,.86,.91)*(1.-.13*noise(floor(p*.7)));}
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
 }
 // Smooth wandering paths alternate gliding and flapping, with independent phases.
 for(int i=0;i<6;i++){
  float id=float(i);float bx=-40.+noise(vec2(time*.045+id*7.+natureSeed,id+31.))*560.;
  float by=65.+noise(vec2(time*.065+id*4.+natureSeed,id+8.))*125.;
  float wing=sin(time*(5.+id*.35)+id*3.)*(.7+noise(vec2(time*.17,id)));
  float size=2.+hash(vec2(id,44.))*1.7;
  if(abs(x-bx)<size&&abs(y-(by+abs(x-bx)*wing*.45))<.65){color=vec3(.31,.38,.43);material=true;}
 }
 if(y>211.){
  material=true;
  color=vec3(.36,.74,.80);
  if(y<213.)color=vec3(.46,.82,.87);
  if(hash(floor(vec2(x*.6-time*.15,y)))>.984)color+=.12;
 }
 float top=crest(x);float bottom=foot(x);float v=(y-top)/(bottom-top);
 if(v>=0.&&y>min(top,211.)){
  material=true;
  color=seaColor(clamp(v,0.,1.),x,y);
  float rip=noise(vec2(x*.63+time*.65,y*.78-time*1.1));
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
   vec2 f=vec2(dot(delta,vec2(ca,sa)),dot(delta,vec2(-sa,ca)));float size=1.4+hash(vec2(id,4.))*1.1;
   float body=step(dot(f/vec2(size*1.65,size*.65),f/vec2(size*1.65,size*.65)),1.);
   float tail=step(-size*2.6,f.x)*step(f.x,-size*.9)*step(abs(f.y+sin(fishState.w)*.65),(-f.x-size*.7)*.65);
   if(max(body,tail)>.5){vec3 fish=mix(vec3(.06,.23,.30),vec3(.35,.50,.33),hash(vec2(id,6.)));color=mix(color,fish,.86);if(f.x>size*.6&&abs(f.y)<.45)color=vec3(.06,.15,.21);}
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
  color+=path*glint*mix(vec3(.13,.22,.34),mix(vec3(.92,.43,.13),vec3(.65,.75,.57),smoothstep(.15,.6,sunlight())),day)*.5;
 }
 // Small wooden sailboat, rendered after the water and lit by the same day cycle.
 vec2 q=boatLocal(p);float mask=boatMask(q);
 if(y>boatY()+2.&&y<boatY()+6.&&abs(x-boat.x)<18.)color=mix(color,illuminate(vec3(.22,.62,.67)),.35);
 if(y>boatY()+1.&&y<boatY()+4.&&abs(x-boat.x+boat.w*17.)<8.+min(abs(boat.z)*.1,12.)){
  if(hash(floor(p+vec2(time*2.,0.)))>.65)color=mix(color,illuminate(vec3(.76,.91,.84)),min(.7,abs(boat.z)*.025));
 }
 if(mask>.5){
  vec3 wood=q.y<-1.?vec3(.74,.42,.21):vec3(.38,.22,.15);
  if(q.y<-4.)wood=q.x<0.?vec3(.88,.77,.54):vec3(1.,.94,.75);
  if(abs(q.x+1.)<.7&&q.y<-3.)wood=vec3(.40,.28,.19);
  color=illuminate(wood);
 }
 vec4 angler=fishingLayer(p);if(angler.a>.5)color=illuminate(angler.rgb);
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
  vec4 fire=campLayer(p);color=mix(color,fire.rgb,fire.a);
 }
 gl_FragColor=vec4(color,1.);
}


