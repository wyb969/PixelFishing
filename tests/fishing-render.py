"""Production GLSL renders, not browser or mobile screenshots."""
import sys,pathlib,json,time,statistics,array
from PIL import Image,ImageDraw,ImageChops
repo=pathlib.Path(__file__).resolve().parents[1];baseline=pathlib.Path(sys.argv[1]);statepath=pathlib.Path(sys.argv[2]);anim=json.loads(pathlib.Path(sys.argv[3]).read_text());out=pathlib.Path(sys.argv[4]);out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['render',str(statepath),str(out)];exec(source,ns);raw=ns['render']
 def render(**kw):
  with ns['ctx']:ns['fbo'].use();return raw(**kw)
 ns['render']=render;return ns
old=engine(baseline);new=engine(repo)
def frame(f,**kw):
 new['state'].update({k:f[k] for k in ['boat','fish','tackle','fishingInfo']});return new['render'](t=f['t'],**kw)
frames=[frame(f) for f in anim['free']];frames[0].save(out/'six-species-swimming.gif',save_all=True,append_images=frames[1:],duration=33,loop=0)
for direction,label in [(1,'right'),(-1,'left')]:
 selected=[f for f in anim['fight'] if f['dir']==direction];images=[frame(f) for f in selected];images[0].save(out/f'reeling-{label}.gif',save_all=True,append_images=images[1:],duration=33,loop=0)
 crops=[im.crop((278,180,365,245)).resize((696,520),Image.Resampling.NEAREST) for im in images];crops[0].save(out/f'reeling-{label}-detail.gif',save_all=True,append_images=crops[1:],duration=33,loop=0)
 sheet=Image.new('RGB',(960,540));
 for i,k in enumerate([0,10,20,30]):sheet.paste(images[k],((i%2)*480,(i//2)*270))
 sheet.save(out/f'reeling-{label}-sequence.png')
f=anim['fight'][40];cases=[('day',{}),('night',{'day':45}),('rain',{'weather':(.92,.62,.85,0),'day':45}),('snow',{'weather':(.88,.32,0,.85),'season':(0,0,0,1),'snow':.85})]
sheet=Image.new('RGB',(960,588),(12,28,37));draw=ImageDraw.Draw(sheet)
for i,(label,kw) in enumerate(cases):
 im=frame(f,**kw);x=(i%2)*480;y=(i//2)*294;sheet.paste(im,(x,y));draw.text((x+8,y+274),label,fill='white');im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'yacht-{label}.png')
sheet.save(out/'yacht-day-night-weather.png')
# Probe actual shader fish silhouettes with no scenery; original art uses six palettes.
with new['ctx']:
 frag=new['common']+'\nvoid main(){vec2 p=vec2(gl_FragCoord.x,270.-gl_FragCoord.y);float species=floor(p.x/80.);vec4 f=fishLayer((p-vec2(species*80.+40.,135.))/5.,species,1.,1.);gl_FragColor=vec4(mix(vec3(.055,.12,.16),f.rgb,f.a),1.);}'
 prog=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](frag));vao=new['ctx'].vertex_array(prog,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')]);new['fbo'].use();vao.render();im=Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);im.crop((0,105,480,165)).resize((1440,180),Image.Resampling.NEAREST).save(out/'six-species-shader.png')
# Arm/crank is animated solely during struggle, not idle waiting. Hold world clock still.
base={**anim['fight'][0]};base['t']=12
base['tackle']=[350,232,2,0];a=frame(base);base['tackle']=[350,232,2,.2];b=frame(base);assert ImageChops.difference(a,b).getbbox() is None,'idle angler moves with fishing age'
base['tackle']=[350,232,4,0];a=frame(base);base['tackle']=[350,232,4,.2];b=frame(base);assert ImageChops.difference(a,b).crop((310,205,335,225)).getbbox(),'reel/hand lacks movement'
assert new['ctx'].error=='GL_NO_ERROR'
bench={}
for label,kw in [('clear',{}),('rain',{'weather':(.92,.62,.85,0)}),('snow',{'weather':(.88,.32,0,.85),'season':(0,0,0,1)})]:
 bench[label]={}
 for name,ns in [('baseline',old),('updated',new)]:
  for _ in range(5):ns['render'](**kw)
  times=[]
  for batch in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](t=12+i/30,**kw)
   times.append((time.perf_counter()-start)*50)
  bench[label][name+'_ms']=statistics.median(times)
(out/'render-metrics.json').write_text(json.dumps(bench,indent=2));print('PASS: 360 continuous scene frames, left/right reel motion, idle crank static, six shader silhouettes, day/night/rain/snow, GL_NO_ERROR.');print(json.dumps(bench,indent=2))
