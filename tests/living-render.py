"""Actual shader/animation checks for branched lightning, independent fire and depth birds."""
import sys,pathlib,time,json,statistics
from PIL import Image,ImageDraw,ImageChops,ImageStat
repo=pathlib.Path(__file__).resolve().parents[1];baseline=pathlib.Path(sys.argv[1]).resolve();states=pathlib.Path(sys.argv[2]).resolve();living=pathlib.Path(sys.argv[3]).resolve();geometries=pathlib.Path(sys.argv[4]).resolve();out=pathlib.Path(sys.argv[5]).resolve();out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['render',str(states),str(out)];exec(source,ns);raw=ns['render']
 def render(**kw):
  with ns['ctx']:ns['fbo'].use();return raw(**kw)
 ns['render']=render;return ns
old=engine(baseline);new=engine(repo);data=json.loads(living.read_text());bolts=json.loads(geometries.read_text())
def weather_frame(f,day=15):
 w=f['weather'];return new['render'](day=day,t=26+w['age']*.7,weather=w['values'],wm=(w['age'],w['drift'],w['windPhase'],w['snowCover']),wf=(w['wind'],w['windTravel']),storm=(w['storm'],w['flash'],w['boltX'],w['boltSeed']),birds=f.get('birds'),bird_visibility=f.get('visibility',0),bolt_segments=f.get('segments'))
for name,frames in data['phases'].items():
 images=[weather_frame(f) for f in frames]
 if name!='clear-return':images[0].save(out/(name+'.gif'),save_all=True,append_images=images[1:],duration=50,loop=0,optimize=False)
 picks=[0,len(images)//4,len(images)//2,len(images)-1];sheet=Image.new('RGB',(1920,294),(12,28,37));draw=ImageDraw.Draw(sheet)
 for i,k in enumerate(picks):sheet.paste(images[k],(i*480,0));draw.text((i*480+8,274),f"{name} {frames[k]['seconds']:.1f}s | opacity {frames[k]['visibility']:.3f}",fill='white')
 sheet.save(out/(name+'-sequence.png'))
assert data['phases']['cloud-escape'][-1]['visibility']<.005
# With cloudy birds effectively gone, setting their shader visibility to zero is visually equivalent.
f=data['phases']['cloud-escape'][-1];a=weather_frame(f);b=weather_frame({**f,'visibility':0});assert max(ImageChops.difference(a,b).tobytes())<=1
# Four detailed bolt variants share the same bounded pulse; no per-frame reshuffling.
sheet=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(sheet)
for row,day in enumerate([15,45]):
 for col,bolt in enumerate(bolts):
  a=dict(day=day,t=26,weather=(.99,.95,1,0),wm=(40,160,39,0),wf=(.76,22),storm=(1,.42,bolt['x'],bolt['seed']),bolt_segments=bolt['segments'],bird_visibility=0)
  im=new['render'](**a);sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),f"{'day' if day==15 else 'night'} | branch seed {bolt['seed']}",fill='white')
  im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'lightning-{row}-{col}.png')
sheet.save(out/'branched-lightning-day-night.png')
for day,label in [(15,'day'),(45,'night')]:
 images=[weather_frame(f,day) for f in data['strike']]
 images[0].save(out/f'branched-lightning-{label}-single-strike.gif',save_all=True,append_images=images[1:],duration=30,optimize=False)
# Fire source is independent, while surfaces still receive weather-appropriate lighting.
cases=[('clear',(0,.12,0,0),(0,1,0,0),0),('rain',(.92,.62,.85,0),(0,1,0,0),0),('snow',(.88,.32,0,.85),(0,0,0,1),0),('storm',(.99,.95,1,0),(0,1,0,0),1)]
fire_sheet=Image.new('RGB',(1920,588),(12,28,37));draw=ImageDraw.Draw(fire_sheet);fire_counts={}
for i,(name,weather,season,storm) in enumerate(cases):
 a=dict(day=45,t=26,weather=weather,season=season,wm=(40,65,30,.9 if name=='snow' else 0),wf=(weather[1]*.8,15),storm=(storm,0,270,0),bird_visibility=0)
 before=old['render'](**a);im=new['render'](**a)
 for row,(label,picture) in enumerate([('baseline',before),('updated',im)]):
  fire_sheet.paste(picture,(i*480,row*294));draw.text((i*480+8,row*294+274),name+' | '+label,fill='white')
 crop=im.crop((163,235,184,255));rgb=list(zip(*[crop.getchannel(j).tobytes() for j in range(3)]));fire_counts[name]=sum(r>180 and g>30 and b<100 for r,g,b in rgb)
 assert fire_counts[name]>=20,(name,'fire too dark')
 im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'bright-fire-{name}-night.png')
# Visible area legitimately varies with foreground grass, snow and precipitation;
# test source emission separately below rather than demanding identical occlusion.
fire_sheet.save(out/'night-fire-all-weather.png')
# Explicitly probe only the fire source: emission is pixel-identical across all weather.
with new['ctx']:
 frag=new['common']+'\nvoid main(){vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));gl_FragColor=campLayer(p);}'
 probe=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](frag));pvao=new['ctx'].vertex_array(probe,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
source_pixels=[]
for name,weather,season,storm in cases:
 new['render'](day=45,t=26,weather=weather,season=season)
 with new['ctx']:
  new['fbo'].use()
  for k in probe:
   if k in new['bg'] and hasattr(probe[k],'value'):probe[k].value=new['bg'][k].value
  pvao.render();im=Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);source_pixels.append(list(zip(*[im.getchannel(j).tobytes() for j in range(3)])))
for i,pixel in enumerate(source_pixels[0]):
 if pixel[0]>200 and pixel[1]>30 and pixel[2]<80:
  for other in source_pixels[1:]:assert other[i]==pixel,'weather dimmed emissive fire'
bench={}
for name,a in [('clear',dict(day=15)),('cloudy',dict(day=15,weather=(.65,.22,0,0),bird_visibility=0)),('storm-peak',dict(day=45,weather=(.99,.95,1,0),storm=(1,.42,bolts[2]['x'],bolts[2]['seed']),bolt_segments=bolts[2]['segments'],bird_visibility=0))]:
 bench[name]={}
 for label,ns in [('baseline',old),('updated',new)]:
  for _ in range(5):ns['render'](**a)
  batches=[]
  for _ in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](**{**a,'t':26+i/30})
   batches.append((time.perf_counter()-start)/20*1000)
  bench[name][label+'_ms']=statistics.median(batches)
 bench[name]['ratio']=bench[name]['updated_ms']/bench[name]['baseline_ms']
report={'cloudy_bird_opacity_after_4s':data['phases']['cloud-escape'][-1]['visibility'],'emissive_fire_pixels_by_weather':fire_counts,'lightning_segments':18,'single_strike_frames':len(data['strike']),'egl_render_readback_ms':bench}
(out/'living-metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
