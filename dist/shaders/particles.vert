attribute vec3 particle;
varying vec3 tint;
varying float visible;
void main(){
 float kind=particle.z;float x=particle.x;
 float v=fract(particle.y+time*(.083+hash(vec2(particle.x,9.))*.035));
 // Surface tracers advect along curved cross-sections; never regenerate noise per frame.
 float arc=pow(v,.58);
 float e=envelope(x);
 x-=arc*(8.+e*16.)*strength+sin(v*9.+particle.x*.18+time*.4)*1.4;
 x+=time*1.4;
 x=mod(x+70.,620.)-70.;
 float top=crest(x),bottom=foot(x);
 float y=mix(top,bottom,v);
 float r=hash(particle.xy);
 float breaking=smoothstep(.48,.88,e);
 visible=1.;
 tint=seaColor(v,x,y);
 if(kind<.5){
  tint+=(r-.5)*.08;
  visible=step(.65,r);
 }else if(kind<1.5){
  // Rows of white square foam follow the curved face of a growing breaker.
  visible=step(.30,r)*step(.06,v)*step(v,.93)*step(.33,breaking);
  tint=mix(vec3(.38,.85,.84),vec3(.88,.99,.88),step(.42,r));
  y+=sin(particle.x*.7)*.65;
 }else{
  // Ballistic spray: short outward arc followed by gravity and extinction.
  float age=fract(time*.43+particle.y);
  x=particle.x+age*12.;top=crest(x);
  y=top-age*(9.+r*9.)+age*age*23.;
  visible=step(age,.72)*step(.64,envelope(x))*step(.35,r);
  tint=vec3(.87,.98,.90);
 }
 visible*=step(y,shore(x)-.8);
 if(kind>.5)visible*=smoothstep(.3,.85,strength);
 visible*=1.-boatMask(boatLocal(vec2(x,y)));
 visible*=1.-fishingLayer(vec2(x,y)).a;
 if(y>160.)visible*=1.-vegetation(vec2(x,y)).a;
 if(abs(x-173.)<25.&&y>210.)visible*=1.-campLayer(vec2(x,y)).a;
 tint=illuminateWater(tint,vec2(x,y));
 vec2 uv=screen(vec2(x,y));
 gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);
 gl_PointSize=max(1.,resolution.y/270.*zoom*(kind<.5?1.:1.25));
}
