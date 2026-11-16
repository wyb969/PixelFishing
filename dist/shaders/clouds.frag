varying vec3 cloudColor;
varying vec2 cloudLocal;
varying vec2 cloudOrigin;
void main(){
 // Three discrete tones: sun-facing shoulder, soft body, cool underside.
 // Light direction tracks the existing moving sun, never a static painted shadow.
 vec2 local=floor(cloudLocal/2.)*2.;
 vec2 lightDirection=normalize(sunPosition()-cloudOrigin+vec2(.001));
 vec2 normal=normalize(vec2(local.x*.018,local.y*.065-.15));
 float facing=dot(normal,lightDirection);
 float top=clamp(-local.y/20.,0.,1.);
 float tone=floor(clamp(.42+facing*.28+top*.24,0.,.99)*3.)/2.;
 vec3 shadow=vec3(.65,.76,.82)+season.x*vec3(.015,.035,.015)+season.z*vec3(.055,.005,-.035)+season.w*vec3(-.045,-.035,-.015);
 vec3 highlight=vec3(.98,.98,.92)+season.x*vec3(-.015,.005,.005)+season.z*vec3(.015,-.035,-.055)+season.w*vec3(-.085,-.065,-.015);
 vec3 albedo=mix(shadow,highlight,tone)*mix(vec3(.97),cloudColor,.18);
 albedo=mix(albedo,albedo*vec3(1.06,.90,.77),dusk()*.35);
 albedo=mix(albedo,albedo*vec3(.72,.76,.81),weather.x*.6);
 vec3 lit=illuminate(albedo);
 // Fair-weather sprites merge into the continuous ceiling instead of remaining
 // five bright stickers against a uniformly grey storm sky.
 vec4 canopy=cloudCanopy(cloudOrigin+cloudLocal);
 lit=mix(lit,canopy.rgb+(tone-.5)*mix(.012,.025,daylight()),overcast());
 // Keep a connected leader visible across the foreground cloud strips too.
 vec4 bolt=lightningLayer(cloudOrigin+cloudLocal);lit=mix(lit,bolt.rgb,bolt.a);
 gl_FragColor=vec4(lit,1.);
}
