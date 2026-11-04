precision highp float;
uniform vec2 resolution;
uniform float time, dayTime, strength, pan, tilt, zoom, natureSeed;
uniform vec4 boat;
uniform vec4 tackle;
uniform vec4 fishingInfo;
uniform vec4 fishStates[14];
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
vec2 boatLocal(vec2 p){vec2 q=p-vec2(boat.x,boatY());q.y-=q.x*sin(time*.7)*.025;return vec2(q.x*boat.w,q.y);}
float boatMask(vec2 q){
 float hull=step(-3.,q.y)*step(q.y,3.)*step(abs(q.x),13.-max(q.y,0.)*1.5);
 float mast=step(abs(q.x+1.),.65)*step(-24.,q.y)*step(q.y,-2.);
 float sail=step(-22.,q.y)*step(q.y,-5.)*step(0.,q.x)*step(q.x,(q.y+23.)*.61);
 float jib=step(-19.,q.y)*step(q.y,-5.)*step(q.x,-2.)*step(-q.x,(q.y+21.)*.48);
 return max(max(hull,mast),max(sail,jib));
}
float segmentDistance(vec2 p,vec2 a,vec2 b){vec2 v=b-a;float t=clamp(dot(p-a,v)/max(dot(v,v),.001),0.,1.);return length(p-a-v*t);}
vec2 lurePosition(){vec2 end=tackle.xy;if(tackle.z==5.)end.y+=boatY()-boat.y;return end;}
vec2 rodPoint(vec2 hand,vec2 rest,float load,float u){
 vec2 force=normalize(lurePosition()-(hand+rest)+vec2(.001));
 // Root keeps its upward tangent; flex grows towards the tip in the pull direction.
 return hand+rest*u+force*(11.*load*u*u*u);
}
vec4 fishingLayer(vec2 p){
 float d=fishingInfo.w;float struggle=tackle.z==4.?sin(tackle.w*8.)*.6:0.;
 vec2 feet=vec2(boat.x+6.*d,boatY()-3.);vec2 q=p-feet;
 vec4 outColor=vec4(0.);
 if(abs(q.x)<2.5&&q.y>-7.&&q.y<-1.)outColor=vec4(.18,.37,.43,1.);
 if(length(q-vec2(0.,-9.))<2.1)outColor=vec4(.85,.64,.43,1.);
 if(abs(q.x)<3.3&&q.y>-12.&&q.y<-10.)outColor=vec4(.74,.51,.25,1.);
 if(abs(q.x)<2.5&&q.y>-1.5&&q.y<1.)outColor=vec4(.20,.23,.26,1.);
 vec2 hand=feet+vec2(d*2.,-6.);vec2 rest=vec2(d*20.,-18.);
 if(tackle.z==1.)rest=vec2(d*(3.+17.*sin(clamp(tackle.w/1.7,0.,1.)*1.57)),-20.);
 float load=tackle.z==4.?.45+fishingInfo.y*.55:.08;
 vec2 tip=rodPoint(hand,rest,load,1.);
 vec2 grip=normalize(rest);
 if(segmentDistance(p,hand-grip*4.,hand+grip*2.)<1.05)outColor=vec4(.65,.45,.24,1.);
 if(length(p-(hand+vec2(d*.8,2.)))<1.7)outColor=vec4(.30,.40,.43,1.);
 if(segmentDistance(p,hand+vec2(d*1.,2.),hand+vec2(d*3.,3.))<.6)outColor=vec4(.64,.70,.66,1.);
 for(int j=0;j<8;j++){
  float u=float(j)/8.;vec2 a=rodPoint(hand,rest,load,u),b=rodPoint(hand,rest,load,u+.125);
  if(segmentDistance(p,a,b)<mix(.8,.4,u))outColor=vec4(mix(vec3(.16,.25,.27),vec3(.44,.54,.49),u),1.);
  if(j==2||j==4||j==6){if(length(p-b-vec2(0.,.5))<.65)outColor=vec4(.72,.77,.70,1.);}
 }
 vec2 end=lurePosition();
 if(tackle.z>=1.&&tackle.z<=5.){
  if(segmentDistance(p,tip,end)<.32)outColor=vec4(.75,.87,.82,1.);
  if(length(p-end)<1.2)outColor=vec4(.94,.43,.24,1.);
 }
 if(tackle.z==5.){vec2 f=p-end;if(dot(f/vec2(3.5,1.5),f/vec2(3.5,1.5))<1.||segmentDistance(f,vec2(-3.,0.),vec2(-5.,-2.))<.7)outColor=vec4(.60,.77,.61,1.);}
 return outColor;
}
float foot(float x){return 245.+(noise(vec2(x*.018-time*.12,time*.07))-.5)*5.;}
float solarAngle(){return (fract(dayTime/60.+.25)-.25)*6.2831853;}
float sunlight(){return sin(solarAngle());}
float daylight(){return smoothstep(-.18,.22,sunlight());}
float dusk(){return (1.-smoothstep(.05,.45,abs(sunlight())))*smoothstep(-.22,.02,sunlight());}
vec2 sunPosition(){float a=solarAngle();return vec2(240.-cos(a)*205.,211.-sin(a)*172.);}
vec3 illuminate(vec3 c){
 vec3 night=c*vec3(.16,.23,.48)+vec3(.006,.008,.025);
 vec3 day=c*mix(vec3(1.12,.78,.57),vec3(1.),smoothstep(.02,.55,sunlight()));
 return mix(night,day,daylight());
}
float shore(float x){return floor((227.+x*.087+sin(x*.016)*2.)/1.4)*1.4;}
vec2 campPosition(){return vec2(173.,shore(173.)+11.);}
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
 float lamp=lurePower(p);
 return illuminate(albedo)+albedo*vec3(.55,1.6,.95)*lamp+vec3(.008,.035,.018)*lamp;
}
// Shore vegetation, shared with particle occlusion so water never paints over leaves.
vec4 vegetation(vec2 p){
 vec4 result=vec4(0.);float wind=sin(time*.55)*.6+(noise(vec2(time*.09,7.))-.5)*1.4;
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
    result=vec4(green,1.);
   }
  }
  if(length(q-vec2(-1.,2.))<1.8||length(q-vec2(2.,3.))<1.5)result=vec4(.35,.25,.13,1.);
 }
 float cell=floor(p.x/13.);float gx=cell*13.+3.+hash(vec2(cell,2.))*6.;float gy=shore(gx)+5.+hash(vec2(cell,8.))*9.;
 for(int j=0;j<5;j++){
  float k=float(j)-2.,h=3.+hash(vec2(cell,k))*5.;float v=(gy-p.y)/h;
  float bend=k*v*.95+wind*v*v;
  if(v>=0.&&v<=1.&&abs(p.x-gx-bend)<.65)result=vec4(mix(vec3(.26,.36,.16),vec3(.48,.54,.23),v),1.);
 }
 return result;
}
vec3 seaColor(float v,float x,float y){
 float patch=noise(floor(vec2(x*.36+time*.38,y*.40-time*.8)));
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
 return c;
}

