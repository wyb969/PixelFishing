from pathlib import Path
root=Path(__file__).resolve().parents[1]
exec(compile((root/'tools/verify_render.py').read_text(encoding='utf-8-sig').split("out=root/'analysis'")[0],str(root/'tools/verify_render.py'),'exec'))
im=render(12,day_time=45);im.resize((1440,810),Image.Resampling.NEAREST).save(root/'analysis/campfire-night.png')
im.crop((125,205,220,270)).resize((950,650),Image.Resampling.NEAREST).save(root/'analysis/campfire-detail.png')
test=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+'void main(){vec2 p=campPosition()+vec2(gl_FragCoord.x-32.,gl_FragCoord.y-48.);vec4 fire=campLayer(p);gl_FragColor=vec4(fire.rgb*fire.a,1.);}'))
tv=ctx.vertex_array(test,[(quad,'2f','position')]);fb=ctx.simple_framebuffer((64,64));fb.use();ctx.viewport=(0,0,64,64)
def capture(day,t):
 test['dayTime'].value=day;test['time'].value=t;tv.render();return Image.frombytes('RGB',(64,64),fb.read(components=3))
day=capture(15,12);night=capture(45,12);later=capture(45,13)
assert not any(sum(c)>0 for c in day.crop((0,0,64,42)).getdata()),'Daytime flames and sparks must be off'
assert sum(c[0]>200 for c in night.getdata())>25,'Night flame must be emissive'
assert night.tobytes()!=later.tobytes(),'Flames and sparks must animate'
light=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+'void main(){float v=campLight(campPosition()+vec2(gl_FragCoord.x<1.?0.:100.,0.));gl_FragColor=vec4(v,v,v,1.);}'))
lv=ctx.vertex_array(light,[(quad,'2f','position')]);small=ctx.simple_framebuffer((2,1));small.use();ctx.viewport=(0,0,2,1);light['time'].value=12;light['dayTime'].value=45;lv.render();pixels=list(small.read(components=3));assert pixels[0]>pixels[3]*4
light['dayTime'].value=15;lv.render();assert not any(small.read(components=3))
print('PASS: daytime extinguished, nighttime flames, animated fire/sparks, local light falloff; night preview saved.')
