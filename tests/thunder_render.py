"""Real shader validation for thunderstorm rain and optional single-pulse lightning."""
import sys,pathlib,time,json,statistics
from PIL import Image,ImageDraw,ImageChops,ImageStat
repo=pathlib.Path(__file__).resolve().parents[1];baseline=pathlib.Path(sys.argv[1]).resolve();states=pathlib.Path(sys.argv[2]).resolve();storm_states=pathlib.Path(sys.argv[3]).resolve();out=pathlib.Path(sys.argv[4]).resolve();out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['renderer',str(states),str(out)];exec(source,ns);raw=ns['render']
 def render(**kw):
  with ns['ctx']:ns['fbo'].use();return raw(**kw)
 ns['render']=render;return ns
old=engine(baseline);new=engine(repo)
def args(day=15,flash=0,intensity=1):return dict(season=(0,1,0,0),day=day,t=26,weather=(.99,.95,1,0),wm=(40,160,39,0),wf=(.76,22),storm=(intensity,flash,300,.64))
# All prior weather appearances are unchanged when no storm or flash is present.
for day in [15,45]:
 for name,weather,season in [('clear',(0,.12,0,0),(0,1,0,0)),('rain',(.92,.62,.85,0),(0,1,0,0)),('snow',(.88,.32,0,.85),(0,0,0,1))]:
  a={**args(day=day,intensity=0),'weather':weather,'season':season,'wm':(40,65,30,.9 if name=='snow' else 0)}
  assert ImageChops.difference(new['render'](**a),old['render'](**a)).getbbox() is None,(name,'baseline changed')
# Measure extra rain using the actual precipitation alpha, not the scene brightness.
with new['ctx']:
 frag=(repo/'dist/shaders/precipitation.frag').read_text().replace('gl_FragColor=vec4(rainColor,opacity);','gl_FragColor=vec4(vec3(opacity),1.);')
 probe=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](new['common']+frag))
 pvao=new['ctx'].vertex_array(probe,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
def rain_mask(intensity):
 new['render'](**args(intensity=intensity))
 with new['ctx']:
  new['fbo'].use()
  for k in probe:
   if k in new['rain'] and hasattr(probe[k],'value'):probe[k].value=new['rain'][k].value
  pvao.render();return Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).getchannel(0)
normal=rain_mask(0);heavy=rain_mask(1);normal_count=sum(x>0 for x in normal.tobytes());heavy_count=sum(x>0 for x in heavy.tobytes());assert heavy_count>normal_count*1.5;assert heavy_count/(480*270)<.03
sheet=Image.new('RGB',(1440,588),(12,28,37));draw=ImageDraw.Draw(sheet);brightness={}
for row,(day,label) in enumerate([(15,'day'),(45,'night')]):
 before=new['render'](**args(day));peak=new['render'](**args(day,.42));after=new['render'](**args(day,0))
 assert ImageChops.difference(before,after).getbbox() is None,'disabled flash leaves residual light'
 for box_name,box in [('sky',(0,0,480,180)),('coast',(0,212,480,265))]:
  a=sum(ImageStat.Stat(before.crop(box)).mean)/3;b=sum(ImageStat.Stat(peak.crop(box)).mean)/3
  assert b>a+15,(box_name,'flash did not light material');assert b-a<65,(box_name,'flash too intense');brightness[label+'-'+box_name]={'before':a,'peak':b}
 assert sum(all(v>245 for v in rgb) for rgb in zip(*[peak.getchannel(i).tobytes() for i in range(3)]))<480*270*.01
 for col,(name,im) in enumerate([('before',before),('single pulse peak',peak),('after / disabled',after)]):
  sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),label+' | '+name,fill='white')
  im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'storm-{label}-{col}.png')
sheet.save(out/'storm-day-night-flash-comparison.png')
data=json.loads(storm_states.read_text())
def from_state(w,day=15,flash=True):return new['render'](season=(0,1,0,0),day=day,t=w['age']*.8,weather=w['values'],wm=(w['age'],w['drift'],w['windPhase'],w['snowCover']),wf=(w['wind'],w['windTravel']),storm=(w['storm'],w['flash'] if flash else 0,w['boltX'],w['boltSeed']))
for day,label in [(15,'day'),(45,'night')]:
 frames=[from_state(f['state'],day) for f in data['frames']]
 # Intentionally no looping metadata: this preview shows ONE strike, never rapid repeat flashes.
 frames[0].save(out/f'storm-{label}-single-strike.gif',save_all=True,append_images=frames[1:],duration=30,optimize=False)
transition=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(transition)
for i,f in enumerate(data['transition']):
 x=i%4*480;y=i//4*294;transition.paste(from_state(f['state'],flash=False),(x,y));draw.text((x+8,y+274),f"storm entry {f['seconds']}s | rain {f['state']['values'][2]:.2f}",fill='white')
transition.save(out/'storm-transition-sequence.png')
bench={}
for name,a in [('prior-rain',{**args(intensity=0),'weather':(.92,.62,.85,0)}),('storm-no-flash',args()),('storm-peak',args(flash=.42))]:
 ns=old if name=='prior-rain' else new
 for _ in range(5):ns['render'](**a)
 batches=[]
 for _ in range(5):
  start=time.perf_counter()
  for i in range(20):ns['render'](**{**a,'t':26+i/30})
  batches.append((time.perf_counter()-start)/20*1000)
 bench[name]=statistics.median(batches)
report={'rain_pixel_count':{'normal':normal_count,'storm':heavy_count,'ratio':heavy_count/normal_count,'storm_screen_fraction':heavy_count/(480*270)},'flash_brightness':brightness,'single_strike_frames':len(data['frames']),'egl_render_readback_ms':bench}
(out/'thunder-metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
