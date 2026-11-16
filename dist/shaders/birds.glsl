uniform vec4 birdStates[9]; // projected x/y, perspective scale, independent wing phase
uniform float birdVisibility;
vec4 birdsLayer(vec2 p){
 vec4 result=vec4(0.);
 if(birdVisibility<.002)return result;
 for(int i=0;i<9;i++){
  vec4 bird=birdStates[i];float scale=bird.z;
  float fade=birdVisibility*smoothstep(.08,.25,scale);
  if(fade<.002||scale<.02)continue;
  vec2 q=(p-bird.xy)/scale;
  if(abs(q.x)>4.2||abs(q.y)>4.)continue;
  float phase=bird.w;
  // Individually phased flap/glide bouts and small banks, not one shared flock pose.
  float glide=smoothstep(.10,.65,sin(phase*.17+float(i)*.9));
  float flap=mix(sin(phase)*1.55,-.25,glide);
  q.y+=q.x*sin(phase*.11+float(i))*.16;
  float wingY=abs(q.x)*flap*.35+pow(abs(q.x)/3.8,2.)*.95;
  float wing=step(abs(q.x),3.8)*step(abs(q.y-wingY),.48/max(scale,.35));
  float body=step(abs(q.x),.75)*step(abs(q.y-.3),.80);
  float mask=max(wing,body);
  if(mask>.5){
   vec3 albedo=mix(vec3(.45,.57,.61),vec3(.84,.87,.82),smoothstep(.15,.7,scale));
   if(abs(q.x)>2.9)albedo*=.68;
   result=vec4(illuminate(albedo),fade);
  }
 }
 return result;
}
