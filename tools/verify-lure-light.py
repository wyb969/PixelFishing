from pathlib import Path
root=Path(__file__).resolve().parents[1]
code=(root/'tools/verify_render.py').read_text(encoding='utf-8-sig')
exec(compile(code.split("out=root/'analysis'")[0],str(root/'tools/verify_render.py'),'exec'))
idx=next(i for i,s in enumerate(motion) if s.get('tackle',[0,0,0])[2]==4 and s['tackle'][3]>2)
im=render((idx+.1)/15,day_time=45)
im.resize((1440,810),Image.Resampling.NEAREST).save(root/'analysis/night-lure.png')
im.crop((280,180,430,260)).resize((1200,640),Image.Resampling.NEAREST).save(root/'analysis/night-lure-detail.png')
test=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+'''
void main(){float i=floor(gl_FragCoord.x);vec3 albedo=i<2.?vec3(.12,.62,.76):vec3(.08,.23,.30);
vec2 p=vec2(360.,234.);if(mod(i,2.)>0.5)p.x+=100.;gl_FragColor=vec4(illuminateWater(albedo,p),1.);}
'''))
tv=ctx.vertex_array(test,[(quad,'2f','position')]);fb=ctx.simple_framebuffer((4,1));fb.use();ctx.viewport=(0,0,4,1)
test['tackle'].value=(360.,234.,4.,2.)
def sample(day):
 test['dayTime'].value=day;tv.render();return list(fb.read(components=3))
night=sample(45);day=sample(15)
assert sum(night[:3])>sum(night[3:6])*2,'Nearby water must receive local light'
assert sum(night[6:9])>sum(night[9:12])*2,'Nearby fish must receive local light'
assert day[:3]==day[3:6] and day[6:9]==day[9:12],'Lure lighting should fade out in daylight'
test['tackle'].value=(360.,234.,6.,2.);off=sample(45)
assert off[:3]==off[3:6],'Light must turn off when lure is retracted'
print('PASS: nearby water and fish illumination, distance falloff, daylight fade, retracted lure off; night render saved.')
