// Three analytic rain volumes, rendered after clouds/water so near drops stay near.
// A fixed, jittered grid is advected through the view; no per-frame random respawns.
float rainStreak(vec2 p,vec2 spacing,float speed,float windScale,float halfLength,float halfWidth,float seed){
 vec2 travel=vec2(windField.y*windScale,weatherMotion.x*speed);
 vec2 q=p-travel;
 vec2 cell=floor(q/spacing);
 vec2 jitter=vec2(hash(cell+vec2(seed,3.)),hash(cell+vec2(7.,seed)));
 vec2 local=q-(cell+.25+jitter*.5)*spacing;
 float slant=windField.x*windScale/speed;
 float line=step(abs(local.y),halfLength)*step(abs(local.x-local.y*slant),halfWidth);
 // A restrained bright head and a fading tail, still on the scene's pixel grid.
 float tail=mix(.35,1.,smoothstep(-halfLength,halfLength,local.y));
 return line*tail*mix(.65,1.,jitter.x);
}
// Snow falls much more slowly than rain. Each stable flake has its own bounded
// flutter around the same integrated wind, never a fresh random offset per frame.
float snowFlake(vec2 p,vec2 spacing,float speed,float windScale,float size,float sway,float seed){
 vec2 q=p-vec2(windField.y*windScale,weatherMotion.x*speed);
 vec2 cell=floor(q/spacing);
 vec2 jitter=vec2(hash(cell+vec2(seed,17.)),hash(cell+vec2(23.,seed)));
 vec2 local=q-(cell+.25+jitter*.5)*spacing;
 float flutter=sin(weatherMotion.x*.8+jitter.y*6.283)*sway;
 local.x-=flutter;
 local.y-=sin(weatherMotion.x*.55+jitter.x*6.283)*sway*.30;
 float radius=size*mix(.85,1.15,jitter.x);
 float flake=step(abs(local.x)+abs(local.y),radius*1.35);
 float core=step(max(abs(local.x),abs(local.y)),radius*.48);
 return max(flake*.68,core)*mix(.75,1.,jitter.y);
}
void main(){
 vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));
 float farRain=0.,middleRain=0.,nearRain=0.,heavyRain=0.;
 if(weather.z>.001){
  farRain=rainStreak(p,vec2(42.,35.),42.,14.,1.8,.38,11.);
  middleRain=rainStreak(p,vec2(66.,59.),88.,32.,4.+stormInfo.x*2.,.50,29.);
  nearRain=rainStreak(p,vec2(108.,96.),155.,60.,7.5+stormInfo.x*3.,.68+stormInfo.x*.10,53.);
  // A fixed extra volume fades in. Never change grid spacing/speed mid-flight.
  if(stormInfo.x>.001)heavyRain=rainStreak(p,vec2(72.,63.),190.,70.,9.,.60,139.);
 }
 float farSnow=0.,middleSnow=0.,nearSnow=0.;
 float snowAmount=weather.w*season.w;
 if(snowAmount>.001){
  farSnow=snowFlake(p,vec2(37.,34.),5.,6.,.48,.45,71.);
  middleSnow=snowFlake(p,vec2(60.,54.),10.,11.,.82,1.1,89.);
  nearSnow=snowFlake(p,vec2(95.,88.),18.,18.,1.40,2.1,107.);
 }
 // Distant rain dissolves into the horizon. Mid-distance drops stop at the shore
 // and pass behind vegetation/boat; only sparse near-camera streaks cross them.
 float clearView=1.;
 if(p.y>155.)clearView=1.-vegetation(p).a;
 clearView*=1.-boatMask(boatLocal(p));
 float sheltered=canopyShelter(p);clearView*=1.-sheltered;
 nearRain*=1.-sheltered;heavyRain*=1.-sheltered;nearSnow*=1.-sheltered;
 farRain*=clearView*(1.-smoothstep(160.,211.,p.y));
 middleRain*=clearView*(1.-smoothstep(shore(p.x)-2.,shore(p.x)+1.,p.y));
 farSnow*=clearView*(1.-smoothstep(165.,214.,p.y));
 middleSnow*=clearView*(1.-smoothstep(shore(p.x)-2.,shore(p.x)+1.,p.y));
 float farAlpha=farRain*.20*weather.z;
 float middleAlpha=middleRain*.36*weather.z;
 float nearAlpha=nearRain*.54*weather.z;
 float opacity=1.-(1.-farAlpha)*(1.-middleAlpha)*(1.-nearAlpha);
 opacity=1.-(1.-opacity)*(1.-heavyRain*.34*weather.z*stormInfo.x);
 // Moonless rain stays blue-grey rather than glowing white at night.
 vec3 rainColor=mix(vec3(.27,.39,.51),vec3(.70,.80,.85),daylight());
 rainColor+=vec3(.20,.22,.24)*stormInfo.y;
 float farSnowAlpha=farSnow*.30*snowAmount;
 float middleSnowAlpha=middleSnow*.55*snowAmount;
 float nearSnowAlpha=nearSnow*.80*snowAmount;
 float snowOpacity=1.-(1.-farSnowAlpha)*(1.-middleSnowAlpha)*(1.-nearSnowAlpha);
 vec3 snowColor=mix(vec3(.43,.53,.65),vec3(.86,.91,.92),daylight());
 if(snowOpacity>0.){
  float combined=1.-(1.-opacity)*(1.-snowOpacity);
  vec3 mixed=(snowColor*snowOpacity+rainColor*opacity*(1.-snowOpacity))/max(combined,.00001);
  gl_FragColor=vec4(mixed,combined);return;
 }
 gl_FragColor=vec4(rainColor,opacity);
}
