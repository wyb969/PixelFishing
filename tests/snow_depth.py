"""Snow depth, environmental response and local EGL performance checks."""
import sys, pathlib, time, json, statistics, math
from PIL import Image, ImageDraw, ImageChops
repo=pathlib.Path(__file__).resolve().parents[1]
baseline=pathlib.Path(sys.argv[1]).resolve();states=pathlib.Path(sys.argv[2]).resolve();env_states=pathlib.Path(sys.argv[3]).resolve();out=pathlib.Path(sys.argv[4]).resolve();out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['renderer',str(states),str(out)];exec(source,ns)
 raw=ns['render']
 def active_render(**kw):
  with ns['ctx']:
   ns['fbo'].use();return raw(**kw)
 ns['render']=active_render;return ns
old=engine(baseline);new=engine(repo)
def args(dt=0,day=15,snow=.85):
 return dict(season=(0,0,0,1),day=day,t=26+dt*.7,weather=(.88,.32,0,snow),wm=(40+dt,65+dt*2.,30+dt*.7,.90),wf=(.28,10+.28*dt))
with new['ctx']:
 frag=(repo/'dist/shaders/precipitation.frag').read_text().replace('gl_FragColor=vec4(mixed,combined);return;','gl_FragColor=vec4(farSnowAlpha,middleSnowAlpha,nearSnowAlpha,1.);return;').replace('gl_FragColor=vec4(rainColor,opacity);','gl_FragColor=vec4(0.);')
 probe=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](new['common']+frag))
 pvao=new['ctx'].vertex_array(probe,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
def mask(**kw):
 new['render'](**kw)
 with new['ctx']:
  new['fbo'].use()
  for k in probe:
   if k in new['rain'] and hasattr(probe[k],'value'):probe[k].value=new['rain'][k].value
  pvao.render();return Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
def components(im):
 data=im.tobytes();pixels={i for i,v in enumerate(data) if v>0};result=[]
 while pixels:
  start=pixels.pop();todo=[start];component=[start]
  while todo:
   i=todo.pop();x=i%480;y=i//480
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]:
    xx=x+dx;yy=y+dy;j=yy*480+xx
    if 0<=xx<480 and 0<=yy<270 and j in pixels:pixels.remove(j);todo.append(j);component.append(j)
  result.append((sum(i%480 for i in component)/len(component),sum(i//480 for i in component)/len(component)))
 return result
m0=mask(**args());m1=mask(**args(1));coverage={};motion={};maxima=[]
for i,(name,speed,wind_scale) in enumerate([('far',5,6),('middle',10,11),('near',18,18)]):
 channel=m0.getchannel(i);count=sum(v>0 for v in channel.tobytes());coverage[name]=count/(480*270);maxima.append(max(channel.tobytes()))
 assert count>10 and coverage[name]<.01
 a=components(channel);b=components(m1.getchannel(i));deltas=[]
 for x,y in a:
  if not(10<x<450 and 10<y<135):continue
  target=(x+.28*wind_scale,y+speed)
  closest=min(b,key=lambda q:math.hypot(q[0]-target[0],q[1]-target[1]))
  if abs(closest[0]-target[0])<3 and abs(closest[1]-target[1])<1.6:deltas.append((closest[0]-x,closest[1]-y))
 assert len(deltas)>=3,(name,'too few tracked flakes')
 dx=statistics.median(d[0] for d in deltas);dy=statistics.median(d[1] for d in deltas)
 assert dx>0 and abs(dy-speed)<1.6,(name,dx,dy)
 motion[name]={'tracked':len(deltas),'median_dx':dx,'median_dy':dy}
 channel.point(lambda v:min(255,v*3)).resize((960,540),Image.Resampling.NEAREST).save(out/f'snow-{name}-diagnostic.png')
assert maxima[0]<maxima[1]<maxima[2]
half=mask(**args(snow=.425))
for i in range(3):assert max(abs(x-2*y) for x,y in zip(m0.getchannel(i).tobytes(),half.getchannel(i).tobytes()))<=1
assert mask(**args(snow=0)).getbbox() is None
assert mask(**{**args(),'season':(0,1,0,0)}).getbbox() is None
# New environmental snow must not freeze or repaint open water.
base={**args(snow=0),'weather':(0,.12,0,0),'t':26}
no_snow=new['render'](**{**base,'wm':(40,65,30,0)})
full_snow=new['render'](**{**base,'wm':(40,65,30,.95)})
assert ImageChops.difference(no_snow,full_snow).crop((400,216,480,230)).getbbox() is None,'snow painted open water'
assert ImageChops.difference(no_snow,full_snow).crop((0,240,480,270)).getbbox() is not None,'shore does not accumulate'
assert ImageChops.difference(no_snow,full_snow).crop((0,170,155,240)).getbbox() is not None,'vegetation does not accumulate'
# No weather or appearance regression for existing clear/rain scenes without snow cover.
for day in [15,45]:
 for name,weather in [('clear',(0,.12,0,0)),('rain',(.92,.62,.85,0))]:
  a={**args(day=day),'season':(0,1,0,0),'weather':weather,'wm':(40,65,30,0)}
  assert ImageChops.difference(new['render'](**a),old['render'](**a)).getbbox() is None,(name,'regression')
# Real 3-second continuous animations, not time-lapse weather changes.
sheet=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(sheet)
for row,(day,label) in enumerate([(15,'day'),(45,'night')]):
 frames=[]
 for i in range(90):
  im=new['render'](**args(i/30,day));frames.append(im)
  if i in [0,15,30,60]:
   col=[0,15,30,60].index(i);sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),f'{label} {i/30:.1f}s',fill='white')
  if i in [0,30,60,89]:im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'snow-{label}-frame-{i:03}.png')
 frames[0].save(out/f'snow-{label}-continuous.gif',save_all=True,append_images=frames[1:],duration=33,loop=0,optimize=False)
sheet.save(out/'snow-depth-continuous-frames.png')
# Inspect the actual simulated accumulation, snow-aftercare and warm-season melt states.
environment=json.loads(env_states.read_text())
for phase in ['accumulating','winter-melt','warm-melt']:
 samples=[f for f in environment if f['name']==phase]
 sheet=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(sheet)
 for i,f in enumerate(samples):
  w=f['state'];im=new['render'](season=f['season'],day=15,t=26,weather=w['values'],wm=(w['age'],w['drift'],w['windPhase'],w['snowCover']),wf=(w['wind'],w['windTravel']))
  x=(i%4)*480;y=(i//4)*294;sheet.paste(im,(x,y));draw.text((x+8,y+274),f"{phase} {f['seconds']}s | snow cover {w['snowCover']:.3f}",fill='white')
 sheet.save(out/(phase+'-sequence.png'))
# Hold all other uniforms fixed to show environmental snow accumulation clearly.
material_sheet=Image.new('RGB',(1440,588),(12,28,37));draw=ImageDraw.Draw(material_sheet)
for row,(day,label) in enumerate([(15,'day'),(45,'night')]):
 for col,cover in enumerate([0,.65,.95]):
  im=new['render'](**{**args(day=day,snow=0),'wm':(40,65,30,cover)})
  material_sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),f'{label} | snow cover {cover}',fill='white')
material_sheet.save(out/'snow-environment-comparison.png')
bench={}
for name in ['clear','rain','snow']:
 bench[name]={};a=args()
 if name=='clear':a.update(weather=(0,.12,0,0),season=(0,1,0,0),wm=(40,65,30,0))
 if name=='rain':a.update(weather=(.92,.62,.85,0),season=(0,1,0,0),wm=(40,65,30,0))
 for label,ns in [('baseline',old),('updated',new)]:
  for _ in range(5):ns['render'](**a)
  batches=[]
  for _ in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](**{**a,'t':26+i/30})
   batches.append((time.perf_counter()-start)/20*1000)
  bench[name][label+'_ms']=statistics.median(batches)
 bench[name]['ratio']=bench[name]['updated_ms']/bench[name]['baseline_ms']
report={'visible_pixel_fraction_per_depth':coverage,'actual_tracked_one_second_motion':motion,'consecutive_frames':180,'egl_including_readback':bench}
(out/'snow-depth-metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
