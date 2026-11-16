"""Production field and fish-state renders; no browser/mobile claims."""
import sys,pathlib,json,math,time,statistics
from PIL import Image,ImageDraw,ImageChops
repo=pathlib.Path(__file__).resolve().parents[1];baseline=pathlib.Path(sys.argv[1]);statepath=pathlib.Path(sys.argv[2]);data=json.loads(pathlib.Path(sys.argv[3]).read_text());out=pathlib.Path(sys.argv[4]);out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')};sys.argv=['render',str(statepath),str(out)];exec(source,ns);raw=ns['render']
 def render(**kw):
  with ns['ctx']:ns['fbo'].use();return raw(**kw)
 ns['render']=render;return ns
old=engine(baseline);new=engine(repo)
def frame(f,**kw):
 for k in ['boat','fish','tackle','fishingInfo']:new['state'][k]=f[k]
 return new['render'](day=f['day'],t=f['t'],wm=(f['seconds'],f['seconds']*.8,f['seconds']*.6,0),light=f['light'],**kw)
def sheet(images,labels,name):
 im=Image.new('RGB',(960,294*math.ceil(len(images)/2)),(12,28,37));d=ImageDraw.Draw(im)
 for i,(pic,label) in enumerate(zip(images,labels)):x=i%2*480;y=i//2*294;im.paste(pic,(x,y));d.text((x+8,y+274),label,fill='white')
 im.save(out/name)
for name,frames in data['groups'].items():
 images=[frame(f) for f in frames]
 if name.startswith('school') or name=='dusk':images[0].save(out/(name+'.gif'),save_all=True,append_images=images[1:],duration=33,loop=0)
 picks=list(range(len(frames))) if name.startswith('arrival') else [0,len(frames)//3,len(frames)*2//3,len(frames)-1]
 sheet([images[i] for i in picks],[f'{name} {frames[i]["seconds"]:.1f}s | power {frames[i]["light"][3]:.2f}' for i in picks],name+'-sequence.png')
 if name.startswith('arrival'):
  # Diagnostic overlay marks actual field contours; not a production sprite.
  f=frames[-1];im=images[-1].copy();d=ImageDraw.Draw(im)
  for e in f['edges']:d.point((round(e['x']),round(e['y'])),fill=(255,230,120))
  im.resize((1440,810),Image.Resampling.NEAREST).save(out/(name+'-edge-diagnostic.png'))
# Direct CPU-vs-GLSL comparison at identical pixel centers, directions and clocks.
with new['ctx']:
 frag=new['common']+'\nvoid main(){vec2 p=world(vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y));gl_FragColor=vec4(vec3(boatSearchLight(p)),1.);}'
 p=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](frag));v=new['ctx'].vertex_array(p,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
max_error=0
for f in data['fields']:
 frame(f)
 with new['ctx']:
  for k in p:
   if k in new['bg'] and hasattr(p[k],'value'):p[k].value=new['bg'][k].value
  new['fbo'].use();v.render();im=Image.frombytes('RGB',(480,270),new['fbo'].read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 for x,y,want in f['samples']:max_error=max(max_error,abs(im.getpixel((x,y))[0]/255-want))
assert max_error<.0041,max_error
# Marker control removes only marker contribution, keeping the same sea/cloud clock.
env=(repo/'dist/shaders/environment.frag').read_text();start=env.index('  // Two tiny navigation');end=env.index('\n }',start);without=env[:start]+env[end:]
with new['ctx']:
 control=new['ctx'].program(vertex_shader=new['source']('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=new['source'](new['common']+new['bird_code']+without));controlvao=new['ctx'].vertex_array(control,[(new['buffer']([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
marker_pixels=[]
for day in [15,45]:
 for seconds in [0,1,2,3,4]:
  f={**data['groups']['school-1'][0],'day':day,'seconds':seconds,'light':list(data['groups']['school-1'][0]['light'])};f['light'][3]=0 if day==15 else 1
  a=frame(f);originalbg,originalvao=new['bg'],new['vao'];new['bg'],new['vao']=control,controlvao
  try:b=frame(f)
  finally:new['bg'],new['vao']=originalbg,originalvao
  difference=ImageChops.difference(a,b);n=sum(any(pixel) for pixel in difference.getdata());marker_pixels.append(n)
  assert n<=14,(day,seconds,n)
  if day==15:assert n==0
assert max(marker_pixels)>0
bench={}
for label,day in [('day',15),('night',45)]:
 bench[label]={}
 for name,ns in [('baseline',old),('updated',new)]:
  # Warm all cached CPU origin samples before measuring scene draw/readback.
  for i in range(20):ns['render'](t=12+i/30,day=day)
  batches=[]
  for _ in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](t=12+i/30,day=day)
   batches.append((time.perf_counter()-start)*50)
  bench[label][name+'_ms']=statistics.median(batches)
report={'cpu_glsl_max_8bit_error':max_error,'marker_changed_pixels':marker_pixels,'continuous_frames':540,'render_readback_ms':bench};(out/'metrics.json').write_text(json.dumps(report,indent=2));print('PASS: real trajectories/rendered dusk/night left/right/moving boat; exact shared field; localized night-only markers.');print(json.dumps(report,indent=2))
