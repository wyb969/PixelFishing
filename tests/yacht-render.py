"""Actual shader transition and visual regression for the enlarged weather-ready yacht."""
import sys,pathlib,json,time,statistics,math,subprocess
from PIL import Image,ImageDraw,ImageChops
repo=pathlib.Path(__file__).resolve().parents[1];baseline=pathlib.Path(sys.argv[1]);statepath=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['render',str(statepath),str(out)];exec(source,ns);raw=ns['render']
 def render(**kw):
  with ns['ctx']:ns['fbo'].use();return raw(**kw)
 ns['render']=render;return ns
old=engine(baseline);new=engine(repo);baseboat=list(new['state']['boat'])
def render(**kw):return new['render'](**kw)
def sheet(images,labels,name):
 im=Image.new('RGB',(960,294*math.ceil(len(images)/2)),(12,28,37));draw=ImageDraw.Draw(im)
 for i,(p,label) in enumerate(zip(images,labels)):
  x=i%2*480;y=i//2*294;im.paste(p,(x,y));draw.text((x+8,y+274),label,fill='white')
 im.save(out/name)
# Both directions, daylight/night and fully open rain/snow shelter.
images=[];labels=[]
directional=json.loads(subprocess.check_output(['node',str(repo/'tests/yacht-states.cjs')]))
for pose in directional:
 direction=pose['dir']
 for key in ['boat','tackle','fishingInfo']:new['state'][key]=pose[key]
 for label,kw in [('clear-day',{}),('clear-night',{'day':45}),('rain-night',{'day':45,'weather':(.92,.62,.85,0)}),('snow-day',{'season':(0,0,0,1),'weather':(.88,.32,0,.85),'snow':.9})]:
  im=render(t=16,**kw);images.append(im);labels.append(label+' | '+('right' if direction==1 else 'left'));im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'{label}-{direction}.png')
  im.crop((274,170,372,242)).resize((784,576),Image.Resampling.NEAREST).save(out/f'detail-{label}-{direction}.png')
sheet(images,labels,'yacht-weather-directions.png')
for key in ['boat','tackle','fishingInfo']:new['state'][key]=directional[0][key]
# One slow scanner sweep, no flashing, with a matching quiet rainy-palm animation.
for label,kw in [('searchlight',{'day':45}),('rain-palm-canopy',{'day':15,'weather':(.92,.62,.85,0)})]:
 images=[render(t=i/15,wm=(i/15,i/15*2,.55*i/15,.0),**kw) for i in range(120)]
 images[0].save(out/(label+'.gif'),save_all=True,append_images=images[1:],duration=67,loop=0)
 sheet([images[k] for k in [0,30,60,90]],[f'{label} {k/15:.1f}s' for k in [0,30,60,90]],label+'-sequence.png')
# Use actual weather arrival/clearing states to demonstrate gradual canopy movement.
frames=[f for f in new['state']['frames'] if f['name'] in ['rain','rain-clearing']]
images=[];labels=[]
for f in frames:
 w=f['state'];images.append(render(day=15,t=16,weather=w['values'],wm=(w['age'],w['drift'],w['windPhase'],w['snowCover']),wf=(w['wind'],w['windTravel'])));labels.append(f['name']+' '+str(f['seconds'])+'s')
sheet(images,labels,'canopy-arrival-clearing.png')
# Probe real helper outputs without scenery to isolate mathematical guarantees.
def probe(ns,body,**kw):
 ns['render'](**kw)
 with ns['ctx']:
  frag=ns['common']+'\nvoid main(){vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));'+body+'}'
  p=ns['ctx'].program(vertex_shader=ns['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=ns['source'](frag));v=ns['ctx'].vertex_array(p,[(ns['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')]);ns['fbo'].use()
  for k in p:
   if k in ns['bg'] and hasattr(p[k],'value'):p[k].value=ns['bg'][k].value
  v.render();im=Image.frombytes('RGB',(480,270),ns['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);v.release();p.release();return im
light='gl_FragColor=vec4(vec3(boatSearchLight(p)),1.);'
assert not probe(new,light,day=15).getbbox(),'daylight searchlight remained on'
a=probe(new,light,day=45,t=0);b=probe(new,light,day=45,t=7);assert a.getbbox() and ImageChops.difference(a,b).getbbox(),'scanner did not rotate'
mask='gl_FragColor=vec4(vec3(boatMask(boatLocal(p))),1.);'
a=probe(old,mask,t=0).getbbox();b=probe(new,mask,t=0).getbbox();ratio=(b[2]-b[0])/(a[2]-a[0]);assert 1.15<ratio<1.25,ratio
canopy='gl_FragColor=vec4(vec3(canopyMask(boatLocal(p))),1.);'
assert probe(new,canopy,weather=(0,.12,0,0)).getbbox() is None
assert probe(new,canopy,weather=(.92,.62,.85,0)).getbbox() is not None
# All nonwinter seasonal weights preserve exactly the same character appearance.
character='gl_FragColor=fishingLayer(p);'
a=probe(new,character,season=(1,0,0,0));b=probe(new,character,season=(0,1,0,0));c=probe(new,character,season=(0,0,1,0));d=probe(new,character,season=(0,0,0,1));assert ImageChops.difference(a,b).getbbox() is None and ImageChops.difference(b,c).getbbox() is None;assert ImageChops.difference(c,d).getbbox()
sheet([a,b,c,d],['spring','summer','autumn','winter'],'character-season-probe.png')
# Roof interior never receives precipitation, including foreground/heavy rain/snow.
for weather,season in [((.99,.95,1,0),(0,1,0,0)),((.88,.32,0,.85),(0,0,0,1))]:
 shelter=probe(new,'gl_FragColor=vec4(vec3(canopyShelter(p)),1.);',weather=weather,season=season,t=16)
 new['render'](weather=weather,season=season,t=16)
 with new['ctx']:
  new['fbo'].clear();new['rvao'].render();rain=Image.frombytes('RGBA',(480,270),new['fbo'].read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 for i,x in enumerate(shelter.getchannel(0).tobytes()):
  if x==255:assert rain.getpixel((i%480,i//480))[3]==0,'precipitation inside deployed roof'
bench={}
for label,kw in [('clear-day',{}),('night-beam',{'day':45}),('rain-canopy',{'day':45,'weather':(.92,.62,.85,0)}),('snow-canopy',{'weather':(.88,.32,0,.85),'season':(0,0,0,1)})]:
 bench[label]={}
 for name,ns in [('baseline',old),('updated',new)]:
  for _ in range(5):ns['render'](**kw)
  batches=[]
  for _ in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](t=16+i/30,**kw)
   batches.append((time.perf_counter()-start)*50)
  bench[label][name+'_ms']=statistics.median(batches)
report={'mask_width_scale':ratio,'continuous_frames':240,'bench_render_readback_ms':bench};(out/'metrics.json').write_text(json.dumps(report,indent=2));print('PASS: two directions, day/night/rain/snow; 240 continuous frames; canopy weather transitions; night-only rotating light; 1.2 mask scale; nonwinter clothes identical; winter changed; sheltered precipitation zero.');print(json.dumps(report,indent=2))
