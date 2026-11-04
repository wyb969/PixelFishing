attribute vec2 center;
attribute vec2 offset;
attribute vec3 color;
varying vec3 cloudColor;
void main(){
 // Move only to the right; wrap while entirely outside the normal camera view.
 vec2 origin=vec2(mod(center.x+time*.55+150.,900.)-150.,center.y);
 vec2 uv=screen(origin+offset);
 gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);
 cloudColor=color;
}
