attribute vec2 center;
attribute vec2 offset;
attribute vec3 color;
varying vec3 cloudColor;
varying vec2 cloudLocal;
varying vec2 cloudOrigin;
void main(){
 // Layers share the integrated wind, with stable altitude shear instead of rigid translation.
 // Never multiply elapsed time by a changing speed: changing weather must not teleport clouds.
 float layerSpeed=.78+(145.-center.y)*.003;
 vec2 origin=vec2(mod(center.x+weatherMotion.y*layerSpeed+240.,1080.)-240.,center.y);
 float row=clamp(-offset.y/20.,0.,1.);
 // Spring: small rounded cumulus. Summer: tall sunlit stacks.
 // Autumn: stretched wind-combed banks. Winter: broad, low layered clouds.
 float width=dot(season,vec4(.78+sin(row*3.14)*.08,.82,1.10+row*.23,1.30-row*.18));
 width*=(1.+weather.x*.8)*(1.+windField.x*.50);
 float height=dot(season,vec4(.85,1.22,.55,.48));
 height*=(1.+weather.x*.35)*(1.-windField.x*.22);
 float lean=(dot(season,vec4(-2.,1.,9.,-5.))+windField.x*9.)*row;
 vec2 shape=vec2(offset.x*width+lean,offset.y*height);
 // Slightly asymmetric shoulders stop the sprites feeling like identical triangles.
 shape.y-=season.x*max(0.,1.-abs(offset.x+9.)/13.)*3.;
 shape.y-=season.y*max(0.,1.-abs(offset.x-10.)/16.)*4.;
 vec2 pixelShape=floor(shape*1.5+.5)/1.5;
 vec2 uv=screen(origin+pixelShape);
 gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);
 cloudColor=color;cloudLocal=pixelShape;cloudOrigin=origin;
}
