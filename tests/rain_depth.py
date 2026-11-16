"""Actual-shader rain-depth QA. Usage: python rain_depth.py BASELINE STATES OUTPUT."""
import sys, pathlib, time, json, statistics
from PIL import Image, ImageDraw, ImageChops, ImageStat
repo=pathlib.Path(__file__).resolve().parents[1]
baseline=pathlib.Path(sys.argv[1]).resolve();states=pathlib.Path(sys.argv[2]).resolve();out=pathlib.Path(sys.argv[3]).resolve();out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['renderer',str(states),str(out)];exec(source,ns)
 raw=ns['render']
 def active_render(**kw):
  with ns['ctx']:
   ns['fbo'].use();return raw(**kw)
 ns['render']=active_render;return ns
old=engine(baseline);new=engine(repo)
def args(dt=0,day=15,rain=.85):
 return dict(season=(0,1,0,0),day=day,t=26+dt*.76,weather=(.92,.62,rain,0),wm=(40+dt,115+dt*3.4,34+dt*.85,0),wf=(.5,15+.5*dt))
# A diagnostic using the SAME production shader: RGB separately records each depth's alpha.
with new['ctx']:
 frag=(repo/'dist/shaders/precipitation.frag').read_text().replace('gl_FragColor=vec4(rainColor,opacity);','gl_FragColor=vec4(farAlpha,middleAlpha,nearAlpha,1.);')
 probe=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](new['common']+frag))
 probe_vao=new['ctx'].vertex_array(probe,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
def mask(**kw):
 new['render'](**kw)
 with new['ctx']:
  new['fbo'].use()
  for k in probe:
   if k in new['rain'] and hasattr(probe[k],'value'):probe[k].value=new['rain'][k].value
  probe_vao.render()
  return Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
m0=mask(**args());m1=mask(**args(1));coverage={}
for i,(name,dx,dy,bottom) in enumerate([('far',7,42,160),('middle',16,88,155),('near',30,155,270)]):
 a=m0.getchannel(i).crop((0,0,480-dx,bottom-dy));b=m1.getchannel(i).crop((dx,dy,480,bottom))
 assert ImageChops.difference(a,b).getbbox() is None,(name,'drops do not follow continuous integrated wind + fall speed')
 channel=m0.getchannel(i);count=sum(v>0 for v in list(channel.tobytes()));coverage[name]=count/(480*270)
 assert count>10 and coverage[name]<.015,(name,'layer missing or too crowded')
 channel.point(lambda v:min(255,v*4)).resize((960,540),Image.Resampling.NEAREST).save(out/f'rain-{name}-diagnostic.png')
# Half rainfall fades existing trajectories instead of changing seeds/counts.
half=mask(**args(rain=.425))
for channel in range(3):
 a=m0.getchannel(channel);b=half.getchannel(channel)
 assert max(abs(x-2*y) for x,y in zip(a.tobytes(),b.tobytes()))<=1
zero=mask(**args(rain=0));assert zero.getbbox() is None
# Unchanged clear-sky rendering at noon and midnight. Snow now has separate depth QA.
for day in [15,45]:
 for name,weather,season in [('clear',(0,.12,0,0),(0,1,0,0))]:
  a={**args(day=day),'weather':weather,'season':season}
  assert ImageChops.difference(new['render'](**a),old['render'](**a)).getbbox() is None,(name,'regression')
# Real consecutive 30 FPS frames. GIF duration is 33 ms, not a sped-up weather sequence.
sheet=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(sheet)
for row,(day,label) in enumerate([(15,'day'),(45,'night')]):
 frames=[]
 for i in range(90):
  im=new['render'](**args(i/30,day));frames.append(im)
  if i in [0,3,6,9]:
   col=i//3;sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),f'{label} {i/30:.1f}s',fill='white')
  if i in [0,15,30,60,89]:im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'rain-{label}-frame-{i:03}.png')
 frames[0].save(out/f'rain-{label}-continuous.gif',save_all=True,append_images=frames[1:],duration=33,loop=0,optimize=False)
sheet.save(out/'rain-depth-continuous-frames.png')
# Local EGL/software timings include readback; not browser or mobile FPS.
bench={}
for name in ['clear','rain','snow']:
 bench[name]={}
 a=args()
 if name=='clear':a['weather']=(0,.12,0,0)
 if name=='snow':a.update(weather=(.88,.32,0,.85),season=(0,0,0,1))
 for label,ns in [('baseline',old),('updated',new)]:
  for _ in range(5):ns['render'](**a)
  batches=[]
  for _ in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](**{**a,'t':26+i/30})
   batches.append((time.perf_counter()-start)/20*1000)
  bench[name][label+'_ms']=statistics.median(batches)
 bench[name]['ratio']=bench[name]['updated_ms']/bench[name]['baseline_ms']
report={'visible_pixel_fraction_per_depth':coverage,'trajectory_translation_test':'exact pixel match at 1 second: far (7,42), middle (16,88), near (30,155)','consecutive_frames':180,'egl_including_readback':bench}
(out/'rain-depth-metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
