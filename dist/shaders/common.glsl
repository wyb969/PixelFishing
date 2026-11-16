precision highp float;
uniform vec2 resolution;
uniform float time, dayTime, strength, pan, tilt, zoom, natureSeed;
uniform vec4 season; // spring, summer (original), autumn, winter
uniform vec4 weather; // cover, wind, rain, snow
uniform vec2 windField; // shared gust intensity, continuously integrated wind travel
uniform vec4 weatherMotion; // continuous seconds, integrated cloud drift, wind phase, snow cover
uniform vec4 stormInfo; // storm intensity, optional capped flash, bolt x, stable strike seed
uniform vec4 lightningSegments[18]; // 12 connected leader segments, two 3-segment branches
uniform vec4 boat;
uniform vec4 boatLight; // shared CPU light origin xy, forward sea angle, dusk/night power
uniform vec4 tackle;
uniform vec4 fishingInfo;
uniform vec4 fishStates[14];
// Material-specific seasonal palettes retain the original blue / teal / amber relationships.
vec3 seasonalWater(vec3 c){return c*(vec3(1.)+season.x*vec3(-.05,.035,-.035)+season.z*vec3(-.04,-.09,-.055)+season.w*vec3(.13,-.12,-.06))+season.w*vec3(.045,.035,.035);}
vec3 seasonalLeaf(vec3 c){return mix(mix(c,c*vec3(1.12,1.08,.95)+vec3(.025,.025,.008),season.x),c*vec3(1.55,.91,.72)+vec3(.035,.012,0.),season.z)*(1.-season.w*.3)+season.w*vec3(.10,.13,.14);}
vec3 seasonalSand(vec3 c){return c+season.x*vec3(-.015,.012,.012)+season.z*vec3(.035,.005,-.012)+season.w*(vec3(.17,.19,.20)-c*.15);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec2 world(vec2 uv){return (uv*vec2(270.*resolution.x/resolution.y,270.)-vec2(135.*resolution.x/resolution.y,210.))/zoom+vec2(240.+pan,210.+tilt);}
vec2 screen(vec2 p){return ((p-vec2(240.+pan,210.+tilt))*zoom+vec2(135.*resolution.x/resolution.y,210.))/vec2(270.*resolution.x/resolution.y,270.);}
// Independent travelling packets with unequal widths, speeds and group strength.
float envelope(float x){
 float a=pow(.5+.5*sin(x*.016-time*.57+noise(vec2(time*.07,2.))*3.),3.);
 float b=pow(.5+.5*sin(x*.027-time*.36+1.9),5.);
 float c=pow(.5+.5*sin(x*.009-time*.21+4.),2.);
 float group=.28+.72*noise(vec2(time*.105,8.));
 return 1.-exp(-(a*.78+b*.38+c*.25)*group*2.2);
}
float crest(float x){float e=envelope(x);float ripple=noise(vec2(x*.055-time*.7,time*.11));return 224.-strength*(2.+33.*e)+(ripple-.5)*strength*2.;}
float boatY(){return crest(boat.x)+1.+sin(time*.85)*.35;}
vec2 boatLocal(vec2 p){vec2 q=p-vec2(boat.x,boatY());q.y-=q.x*sin(time*.7)*.025;return vec2(q.x*boat.w,q.y)/1.2;}
vec2 boatWorld(vec2 q){q*=1.2;q.x*=boat.w;q.y+=q.x*sin(time*.7)*.025;return q+vec2(boat.x,boatY());}
float canopyDeployment(){return smoothstep(.015,.50,weather.z+weather.w);}
float canopyMask(vec2 q){
 float u=canopyDeployment();if(u<.001)return 0.;
 float roof=-14.-8.*u,end=-12.+31.*u;
 float fabric=step(-14.,q.x)*step(q.x,end)*step(abs(q.y-roof),1.0);
 float rear=step(abs(q.x+12.5),.55)*step(roof,q.y)*step(q.y,-13.);
 float strut=smoothstep(.30,.95,u);float front=step(abs(q.x-(end-1.5)),.45)*step(-3.-19.*strut,q.y)*step(q.y,-3.);
 return max(fabric,max(rear,front));
}
float canopyShelter(vec2 p){
 vec2 q=boatLocal(p);float u=canopyDeployment(),roof=-14.-8.*u,end=-12.+31.*u;
 return smoothstep(.05,.40,u)*step(-14.,q.x)*step(q.x,end)*step(roof+1.,q.y)*step(q.y,-2.);
}
float boatMask(vec2 q){
 // Compact cabin cruiser: raked bow, low cabin, handrail and stern outboard.
 float hull=step(-3.,q.y)*step(q.y,4.)*step(-18.+max(q.y,0.)*.55,q.x)*step(q.x,22.-max(q.y+1.,0.)*1.5);
 float cabin=step(-13.,q.x)*step(q.x,1.-max(-q.y-7.,0.)*.35)*step(-13.,q.y)*step(q.y,-3.);
 float roof=step(-14.,q.x)*step(q.x,2.)*step(-14.,q.y)*step(q.y,-12.);
 float rail=step(3.,q.x)*step(q.x,18.)*step(abs(q.y+6.),.5);
 float posts=step(-6.,q.y)*step(q.y,-3.)*max(step(abs(q.x-4.),.5),step(abs(q.x-17.),.5));
 float motor=step(-21.,q.x)*step(q.x,-18.)*step(-3.,q.y)*step(q.y,4.);
 float lamp=step(-1.,q.x)*step(q.x,2.)*step(-16.5,q.y)*step(q.y,-13.);
 return max(max(max(max(hull,cabin),max(roof,rail)),max(posts,motor)),max(canopyMask(q),lamp));
}
float segmentDistance(vec2 p,vec2 a,vec2 b){vec2 v=b-a;float t=clamp(dot(p-a,v)/max(dot(v,v),.001),0.,1.);return length(p-a-v*t);}
vec4 lightningLayer(vec2 p){
 // Most pixels reject the narrow distant bolt without entering the segment loop.
 if(stormInfo.y<=0.||abs(p.x-stormInfo.z)>80.||p.y<15.||p.y>215.)return vec4(0.);
 float leader=1000.,branch=1000.;
 for(int i=0;i<18;i++){
  vec4 s=lightningSegments[i];float d=segmentDistance(p,s.xy,s.zw);
  if(i<12)leader=min(leader,d);else branch=min(branch,d);
 }
 float core=step(leader,.62),fork=step(branch,.43);
 float halo=exp(-min(leader,branch)*.62)*.16;
 float alpha=min(.95,(core+fork*.62+halo)*stormInfo.y*2.1);
 return vec4(mix(vec3(.67,.80,.98),vec3(.91,.96,1.),core),alpha);
}
vec2 lurePosition(){vec2 end=tackle.xy;if(tackle.z==5.)end.y+=boatY()-boat.y+(end.x-boat.x)*sin(time*.7)*.025;return end;}
vec2 rodPoint(vec2 hand,vec2 rest,float load,float u){
 vec2 force=normalize(boatLocal(lurePosition())-(hand+rest)+vec2(.001));
 // Root keeps its upward tangent; flex grows towards the tip in the pull direction.
 return hand+rest*u+force*(11.*load*u*u*u);
}
// Original six-species pixel silhouettes, shared by swimming and landed fish.
vec4 fishLayer(vec2 f,float species,float phase,float scale){
 f/=scale;float longBody=species==3.?1.25:species==1.?.85:species==5.?.92:species==4.?1.12:1.;
 float height=species==1.?1.20:species==5.?1.15:species==4.?.96:species==3.?.70:.82;
 float body=step(dot(f/vec2(3.5*longBody,1.7*height),f/vec2(3.5*longBody,1.7*height)),1.);
 float wave=sin(phase)*.9;float tail=step(-6.2*longBody,f.x)*step(f.x,-2.7*longBody)*step(abs(f.y+wave),(-f.x/longBody-2.3)*.62);
 float dorsal=step(-1.7,f.x)*step(f.x,1.2)*step(-2.5*height,f.y)*step(f.y,-.8);
 if(max(max(body,tail),dorsal)<.5)return vec4(0.);
 vec3 c=vec3(.56,.78,.83);
 if(species==1.)c=vec3(.90,.73,.32);
 else if(species==2.)c=vec3(.51,.71,.58);
 else if(species==3.)c=vec3(.26,.66,.69);
 else if(species==4.)c=vec3(.61,.51,.71);
 else if(species==5.)c=vec3(.69,.60,.41);
 if(f.y<-.5)c*=.74;else if(f.y>.45)c=mix(c,vec3(.94,.90,.68),.26);
 if(species==1.&&abs(f.x)<2.6&&mod(f.x+4.,2.4)<.65)c*=.55;
 if(species==3.&&abs(f.y)<.45)c=vec3(.62,.88,.89);
 if(species==4.&&f.x<1.8&&f.x>-2.&&mod(f.x+4.,2.)<.65)c*=.6;
 if(species==5.&&f.x<2.&&hash(floor(f*1.5))>.76)c*=.50;
 if(body<.5){c*=.83;if(species==2.)c=vec3(.87,.46,.35);}
 if(f.x>2.*longBody&&f.x<3.2*longBody&&abs(f.y+.25)<.48)c=vec3(.035,.09,.12);
 return vec4(c,1.);
}
vec4 fishingLayer(vec2 p){
 p=boatLocal(p);float d=fishingInfo.w*boat.w;bool fighting=tackle.z==4.;
 float pull=fighting?fishingInfo.y:0.;float lean=-d*pull*.9;
 vec2 feet=vec2(7.*d,-3.);vec2 q=p-feet;
 vec4 outColor=vec4(0.);
 // Separate boots and braced legs, a bright life vest, sun cap and small face.
 if(segmentDistance(q,vec2(-1.,-4.),vec2(-2.,0.))<.85||segmentDistance(q,vec2(1.,-4.),vec2(2.,0.))<.85)outColor=vec4(.17,.23,.29,1.);
 if(q.y>-.5&&q.y<1.&&abs(q.x)<3.)outColor=vec4(.12,.17,.21,1.);
 if(abs(q.x-lean)<2.3&&q.y>-9.&&q.y<-3.5)outColor=vec4(.85,.39,.18,1.);
 if(abs(q.x-lean)<.5&&q.y>-8.&&q.y<-4.)outColor=vec4(.96,.73,.34,1.);
 vec2 head=vec2(lean,-11.);
 if(length(q-head)<2.15)outColor=vec4(.88,.69,.48,1.);
 if(q.y<-12.&&q.y>-14.&&abs(q.x-lean)<2.4)outColor=vec4(.88,.86,.67,1.);
 if(q.y<-11.8&&q.y>-12.8&&abs(q.x-lean-d)<3.0)outColor=vec4(.26,.42,.46,1.);
 if(length(q-head-vec2(d*1.1,-.1))<.5)outColor=vec4(.12,.20,.23,1.);
 float winter=season.w;
 if(winter>0.){
  if(abs(q.x-lean)<2.85&&q.y>-9.5&&q.y<-3.5){
   vec3 coat=vec3(.28,.43,.57);if(mod(-q.y,2.)<.55)coat*=.76;
   if(abs(q.x-lean)<.4)coat=vec3(.75,.78,.69);
   outColor=vec4(mix(outColor.rgb,coat,winter),max(outColor.a,winter));
  }
  if(q.y<-12.&&q.y>-15.&&abs(q.x-lean)<2.6)outColor=vec4(mix(outColor.rgb,vec3(.30,.43,.55),winter),max(outColor.a,winter));
  if(q.y<-11.8&&q.y>-12.8&&abs(q.x-lean-d)<3.)outColor=vec4(mix(outColor.rgb,vec3(.79,.77,.62),winter),max(outColor.a,winter));
  if(length(q-vec2(lean,-15.5))<1.1)outColor=vec4(.83,.80,.65,winter);
  if(q.y>-9.5&&q.y<-8.3&&abs(q.x-lean)<2.4)outColor=vec4(mix(outColor.rgb,vec3(.72,.37,.25),winter),max(outColor.a,winter));
 }
 vec2 shoulder=feet+vec2(lean,-8.);vec2 hand=feet+vec2(d*3.,-6.-pull*.5);vec2 rest=vec2(d*20.,-18.);
 if(tackle.z==1.)rest=vec2(d*(3.+17.*sin(clamp(tackle.w/1.7,0.,1.)*1.57)),-20.);
 float load=fighting?.45+fishingInfo.y*.55:.08;
 vec2 tip=rodPoint(hand,rest,load,1.),grip=normalize(rest);
 if(segmentDistance(p,shoulder,hand)<.85)outColor=vec4(mix(vec3(.88,.69,.48),vec3(.28,.43,.57),winter*(1.-smoothstep(.5,1.2,1.5-length(p-hand)))),1.);
 if(segmentDistance(p,hand-grip*4.,hand+grip*2.)<1.05)outColor=vec4(.65,.45,.24,1.);
 vec2 reel=hand+vec2(d*.3,2.);
 if(length(p-reel)<1.55)outColor=vec4(.23,.35,.39,1.);
 if(length(p-reel)<.7)outColor=vec4(.74,.81,.72,1.);
 // Only the struggle stage turns the crank; its hand stays attached to the handle.
 float turn=fighting?tackle.w*9.:.7;
 vec2 crank=reel+vec2(d*cos(turn)*2.1,sin(turn)*1.4);
 vec2 elbow=shoulder+vec2(-d*.6,3.2);
 if(min(segmentDistance(p,shoulder,elbow),segmentDistance(p,elbow,crank))<.65)outColor=vec4(mix(vec3(.88,.69,.48),vec3(.28,.43,.57),winter*smoothstep(.6,1.3,length(p-crank))),1.);
 if(segmentDistance(p,reel,crank)<.45)outColor=vec4(.68,.75,.73,1.);
 if(length(p-crank)<.7)outColor=vec4(.94,.75,.51,1.);
 for(int j=0;j<8;j++){
  float u=float(j)/8.;vec2 a=rodPoint(hand,rest,load,u),b=rodPoint(hand,rest,load,u+.125);
  if(segmentDistance(p,a,b)<mix(.8,.4,u))outColor=vec4(mix(vec3(.16,.25,.27),vec3(.44,.54,.49),u),1.);
  if(j==2||j==4||j==6){if(length(p-b-vec2(0.,.5))<.65)outColor=vec4(.72,.77,.70,1.);}
 }
 vec2 end=boatLocal(lurePosition());
 if(tackle.z>=1.&&tackle.z<=5.){
  if(segmentDistance(p,tip,end)<.32)outColor=vec4(.75,.87,.82,1.);
  if(length(p-end)<1.2)outColor=vec4(.94,.43,.24,1.);
 }
 if(tackle.z==5.){vec4 fish=fishLayer(p-end,mod(max(0.,fishingInfo.x),6.),tackle.w*12.,1.);if(fish.a>.5)outColor=fish;}
 return outColor;
}
float foot(float x){return 245.+(noise(vec2(x*.018-time*.12,time*.07))-.5)*5.;}
float solarAngle(){return (fract(dayTime/60.+.25)-.25)*6.2831853;}
// Shared by the disc, halo and direct reflection. No visible precipitation can leak sun.
float solarVisibility(){return (1.-smoothstep(.42,.68,weather.x))*(1.-smoothstep(.002,.008,weather.z+weather.w));}
float sunlight(){return sin(solarAngle());}
float daylight(){return smoothstep(-.18,.22,sunlight());}
float boatLampPower(){return boatLight.w;}
float boatSearchLight(vec2 p){
 float on=boatLampPower();if(on<=0.)return 0.;
 vec2 origin=boatLight.xy;
 float angle=boatLight.z;vec2 aim=vec2(boat.w*cos(angle),sin(angle));
 vec2 delta=p-origin;float along=dot(delta,aim);if(along<1.||along>185.)return 0.;
 float side=abs(delta.x*aim.y-delta.y*aim.x),width=1.5+along*.10;
 float cone=1.-smoothstep(width*.55,width,side);
 float range=1.-smoothstep(70.,185.,along);
 return on*cone*range*.70;
}
float dusk(){return (1.-smoothstep(.05,.45,abs(sunlight())))*smoothstep(-.22,.02,sunlight());}
vec2 sunPosition(){float a=solarAngle();return vec2(240.-cos(a)*205.,211.-sin(a)*172.);}
float overcast(){return smoothstep(.30,.84,weather.x);}
// An advected, stepped cloud ceiling, not a flat tint. At the rain/snow threshold
// the banks join into a closed canopy; their undersides still have readable depth.
vec4 cloudCanopy(vec2 p){
 float front=overcast();if(front<=0.)return vec4(0.);
 vec2 q=floor(p/2.)*2.;float h=clamp(q.y/211.,0.,1.);
 float broad=noise(vec2((q.x-windField.y*4.)*.009,q.y*.025));
 float bank=noise(vec2((q.x-windField.y*8.)*.018+7.,q.y*.045));
 float fine=noise(vec2((q.x-windField.y*12.)*.035,q.y*.075));
 float tone=floor(clamp(broad*.55+bank*.35+fine*.10,0.,.999)*5.)/4.;
 float edge=108.+(broad-.5)*42.;
 float underside=smoothstep(edge-8.,edge+2.,q.y)*(1.-smoothstep(edge+10.,edge+27.,q.y));
 vec3 cloudDay=mix(vec3(.24,.31,.39),vec3(.46,.51,.54),h);
 cloudDay+=(tone-.5)*.10-underside*.045;
 cloudDay+=season.w*vec3(.025,.030,.025);
 cloudDay=mix(cloudDay,cloudDay*vec3(1.08,.90,.85),dusk()*.25);
 cloudDay*=mix(vec3(1.),vec3(.83,.86,.90),stormInfo.x);
 vec3 cloudNight=mix(vec3(.032,.047,.080),vec3(.075,.105,.155),h);
 cloudNight+=(tone-.5)*.030-underside*.010;
 float coverage=smoothstep(.20,.65,front+broad*.5-.15)*smoothstep(0.,.10,front);
 return vec4(mix(cloudNight,cloudDay,daylight())+vec3(.36,.42,.50)*stormInfo.y,coverage);
}
vec3 illuminate(vec3 c){
 vec3 night=c*vec3(.16,.23,.48)+vec3(.006,.008,.025);
 vec3 day=c*mix(vec3(1.12,.78,.57),vec3(1.),smoothstep(.02,.55,sunlight()));
 day=mix(day,day*vec3(.73,.80,.85),weather.x*.65);
 // Cloud cover removes warm direct light but retains cool diffuse skylight.
 // Night uses its own floor instead of multiplying an already-dark scene again.
 day=mix(day,c*vec3(.51,.57,.65),overcast());
 night=mix(night,c*vec3(.11,.16,.29)+vec3(.008,.012,.022),overcast()*.75);
 day*=mix(vec3(1.),vec3(.90,.92,.95),stormInfo.x);
 return mix(night,day,daylight())+c*vec3(.55,.65,.75)*stormInfo.y;
}
float shore(float x){return floor((227.+x*.087+sin(x*.016)*2.)/1.4)*1.4;}
vec2 campPosition(){return vec2(173.,shore(173.)+11.);}
// Fire is its own warm emitter, like the lure: cloud/rain never darkens its source.
float campStrength(){return 1.-smoothstep(-.12,.12,sunlight());}
float campLight(vec2 p){
 float pulse=.88+.07*sin(time*7.1)+.05*sin(time*11.7+1.);
 return campStrength()*pulse*exp(-length((p-campPosition()+vec2(0.,5.))*vec2(.8,1.2))*.075);
}
vec4 campLayer(vec2 p){
 vec2 q=floor(p)-campPosition();vec4 c=vec4(0.);float on=campStrength();
 float ring=length(q/vec2(9.,3.));
 if(ring<1.15&&ring>.83)c=vec4(illuminate(vec3(.32,.34,.33)),1.);
 if(ring<.83)c=vec4(illuminate(vec3(.17,.14,.11)),1.);
 float logA=segmentDistance(q,vec2(-6.,-2.),vec2(6.,1.));
 float logB=segmentDistance(q,vec2(-6.,1.),vec2(6.,-2.));
 if(min(logA,logB)<1.3)c=vec4(illuminate(vec3(.37,.23,.12))+vec3(.18,.045,.008)*on,1.);
 if(on>0.){
  for(int i=0;i<3;i++){
   float id=float(i);float h=10.+id*3.+sin(time*4.5+id*2.)*2.;
   float u=(-q.y-1.)/h;float center=(id-1.)*3.+sin(time*3.+id*1.7+u*3.)*u*2.;
   float width=(1.-u)*(3.5-id*.35);
   if(u>0.&&u<1.&&abs(q.x-center)<width){
    float core=1.-abs(q.x-center)/max(width,.1);
    vec3 flame=mix(vec3(1.,.23,.025),vec3(1.,.81,.18),core);
    if(core>.7&&u<.45)flame=vec3(1.,.96,.57);
    c=vec4(flame,on);
   }
  }
  for(int i=0;i<12;i++){
   float id=float(i),r=hash(vec2(id,63.));float age=fract(time*(.18+r*.07)+r);
   vec2 spark=vec2((r-.5)*8.+sin(age*7.+id)*age*5.,-4.-age*(22.+r*12.));
   if(abs(q.x-spark.x)<.6&&abs(q.y-spark.y)<.7)c=vec4(1.,.43+.35*(1.-age),.07,on*(1.-age));
  }
 }
 return c;
}
float lurePower(vec2 p){
 if(tackle.z<1.||tackle.z>4.)return 0.;
 return (1.-daylight())*exp(-length((p-lurePosition())*vec2(1.,1.15))*.095);
}
vec3 illuminateWater(vec3 albedo,vec2 p){
 float lamp=lurePower(p),search=boatSearchLight(p);
 return illuminate(albedo)+albedo*vec3(.55,1.6,.95)*lamp+vec3(.008,.035,.018)*lamp+albedo*vec3(.90,1.03,.68)*search;
}
// Shore vegetation, shared with particle occlusion so water never paints over leaves.
vec4 vegetation(vec2 p){
 vec4 result=vec4(0.);float wind=sin(weatherMotion.z)*(.6+windField.x*1.4+weather.z*.70)+windField.x*3.2;
 for(int i=0;i<3;i++){
  float id=float(i),bx=22.+id*51.;float base=shore(bx)+12.;float h=47.+sin(id*2.)*10.;
  float u=clamp((base-p.y)/h,0.,1.);float lean=(7.+id*2.+wind)*u*u;
  if(p.y<base&&p.y>base-h&&abs(p.x-bx-lean)<2.2-u*.9){
   vec3 bark=mix(vec3(.35,.24,.14),vec3(.62,.45,.25),step(0.,p.x-bx-lean));
   if(mod(floor(p.y),5.)<1.)bark*=.8;result=vec4(bark,1.);
  }
  vec2 crown=vec2(bx+7.+id*2.+wind,base-h);vec2 q=p-crown;
  for(int j=0;j<4;j++){
   float k=float(j),len=20.-k*3.;float t=abs(q.x)/len;
   float leafY=(-9.+k*4.)*sin(t*2.5)+t*t*(6.+k)+wind*t*sign(q.x);
   float thickness=(1.-t)*(1.8-k*.2);
   if(t<1.&&abs(q.y-leafY)<thickness+.4){
    vec3 green=mix(vec3(.16,.35,.17),vec3(.38,.56,.22),k/3.);
    if(mod(floor(abs(q.x)),3.)<1.&&abs(q.y-leafY)>.7)green*=.8;
    // Palms remain evergreen; only a restrained snow ridge rests on upper fronds.
    green=green*(1.-season.w*.16)+season.w*vec3(.025,.035,.04);
    float snow=weatherMotion.w*step(q.y-leafY,0.)*step(abs(q.x),len*.75);
    result=vec4(mix(green,vec3(.82,.87,.85),snow*.75),1.);
   }
  }
  if(length(q-vec2(-1.,2.))<1.8||length(q-vec2(2.,3.))<1.5)result=vec4(.35,.25,.13,1.);
 }
 float cell=floor(p.x/13.);float gx=cell*13.+3.+hash(vec2(cell,2.))*6.;float gy=shore(gx)+5.+hash(vec2(cell,8.))*9.;
 for(int j=0;j<5;j++){
  float k=float(j)-2.,h=3.+hash(vec2(cell,k))*5.;float v=(gy-p.y)/h;
  float bend=k*v*.95+wind*v*v;
  if(v>=0.&&v<=1.&&abs(p.x-gx-bend)<.65){
   vec3 grass=seasonalLeaf(mix(vec3(.26,.36,.16),vec3(.48,.54,.23),v));
   grass=mix(grass,vec3(.81,.87,.86),weatherMotion.w*smoothstep(.70,.96,v)*.8);
   result=vec4(grass,1.);
  }
 }
 // Tiny salt-meadow flowers use the existing grass spacing, never cover the water.
 float bloom=step(.58,hash(vec2(cell,51.)))*season.x;
 if(bloom>.01&&length(p-vec2(gx,gy-4.))<1.25){result=vec4(mix(result.rgb,vec3(.90,.75,.65),bloom),max(result.a,bloom));}
 return result;
}
vec3 seaColor(float v,float x,float y){
 float patch=noise(floor(vec2(x*.36-time*.18-windField.y*2.6,y*.40-time*.8)));
 float band=floor((v+(patch-.5)*.12)*9.);
 vec3 c=vec3(.12,.68,.77);
 if(band<1.)c=vec3(.20,.79,.84);
 else if(band<2.)c=vec3(.13,.73,.80);
 else if(band<4.)c=vec3(.12,.62,.76);
 else if(band<6.)c=vec3(.15,.51,.72);
 else if(band<8.)c=vec3(.16,.46,.67);
 else c=vec3(.11,.57,.66);
 if(patch>.64)c+=vec3(.015,.055,.025);
 if(patch<.30)c-=vec3(.015,.045,.02);
 // Wind ripples travel right with the same integrated field as clouds and vegetation.
 // These are diffuse surface variations, not direct sunlight, so they remain in overcast weather.
 float windRipple=noise(floor(vec2((x-windField.y*12.)*.20,y*1.6)));
 c+=vec3(.035,.065,.050)*step(.64,windRipple)*windField.x;
 return seasonalWater(c);
}

