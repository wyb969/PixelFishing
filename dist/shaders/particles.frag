precision highp float;
varying vec3 tint;
varying float visible;
void main(){if(visible<.5)discard;gl_FragColor=vec4(tint,1.);}
