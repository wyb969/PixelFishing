import sys,math,array,json,subprocess,functools
from pathlib import Path

import moderngl
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];out=Path(sys.argv[2]);out.mkdir(exist_ok=True)
ctx=moderngl.create_standalone_context(backend='egl');folder=root/'dist/shaders';common=(folder/'common.glsl').read_text();state=json.loads(Path(sys.argv[1]).read_text())
def source(t,vertex=False):
 t=t.replace('precision highp float;','').replace('attribute ','in ').replace('varying ','out ' if vertex else 'in ')
 if not vertex:t='out vec4 fragColor;\n'+t.replace('gl_FragColor','fragColor')
 return '#version 330\n'+t
bird_path=folder/'birds.glsl';bird_code=bird_path.read_text() if bird_path.exists() else ''
bg=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+bird_code+(folder/'environment.frag').read_text()))
cloud=ctx.program(vertex_shader=source(common+(folder/'clouds.vert').read_text(),True),fragment_shader=source(common+(folder/'clouds.frag').read_text()))
points=ctx.program(vertex_shader=source(common+(folder/'particles.vert').read_text(),True),fragment_shader=source((folder/'particles.frag').read_text()))
rain_path=folder/'precipitation.frag'
rain=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+rain_path.read_text())) if rain_path.exists() else None
def buffer(data):return ctx.buffer(array.array('f',data).tobytes())
vao=ctx.vertex_array(bg,[(buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')]);cvao=ctx.vertex_array(cloud,[(buffer(state['cloud']),'2f 2f 3f','center','offset','color')])
rvao=ctx.vertex_array(rain,[(buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')]) if rain else None
data=[]
for step,rows,kind in [(1.7,23,0),(6.8,24,1),(2.6,1,2)]:
 x=-70
 while x<550:
  for j in range(rows):data.extend([x,j/rows if kind<2 else math.fmod(math.sin(x*127.1)*43758.5453,1)+1,kind])
  x+=step
pvao=ctx.vertex_array(points,[(buffer(data),'3f','particle')]);ctx.enable(moderngl.PROGRAM_POINT_SIZE)
dark_common=common.replace('return (1.-smoothstep(.42,.68,weather.x))*(1.-smoothstep(.002,.008,weather.z+weather.w));','return 0.;')
dark_bg=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(dark_common+bird_code+(folder/'environment.frag').read_text()))
dark_vao=ctx.vertex_array(dark_bg,[(buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),'2f','position')])
fbo=ctx.simple_framebuffer((480,270));fbo.use();ctx.viewport=(0,0,480,270)
@functools.lru_cache(maxsize=512)
def light_origin_y(x,t,strength):
 # Exact production JS wave position, cached outside timed steady-state batches.
 code="const M=require(process.argv[1]);console.log(M.visualBoatY({boat:{x:+process.argv[2]}},+process.argv[3],+process.argv[4]));"
 return float(subprocess.check_output(['node','-e',code,str(root/'dist/motion.js'),str(x),str(t),str(strength)]))
def dusk_power(day):
 sun=math.sin(((day/60+.25)%1-.25)*math.pi*2);v=max(0,min(1,(sun+.10)/.28));return 1-v*v*(3-2*v)
def render(season=(0,1,0,0),day=15,t=12,weather=(0,.12,0,0),snow=0,wm=None,wf=None,no_solar=False,storm=(0,0,270,0),birds=None,bird_visibility=None,bolt_segments=None,light=None):
 active_bg=dark_bg if no_solar else bg
 power=.18*(1+(wf[0] if wf else weather[1])*.65)
 if 'boatLight' in active_bg and light is None:
  bx=state['boat'][0];direction=state['boat'][3];light=(bx+.6*direction,light_origin_y(bx,t,power)-19.2+.6*direction*math.sin(t*.7)*.025,.28+math.sin(t*.18)*.045,dusk_power(day))
 for prog in [active_bg,cloud,points]+([rain] if rain else []):
  values=dict(resolution=(480,270),time=t,dayTime=day,strength=.18*(1+(wf[0] if wf else weather[1])*.65),pan=0.,tilt=0.,zoom=1.,natureSeed=0.,season=season,weather=weather,stormInfo=storm,birdVisibility=(0. if weather[0]>.38 else 1.) if bird_visibility is None else bird_visibility,weatherMotion=wm or (t,t*(.3+weather[1]*4),t*(.55+weather[1]*.6),snow),windField=wf or (weather[1],t*weather[1]),boat=tuple(state['boat']),boatLight=light or (0,0,0,0),tackle=tuple(state['tackle']),fishingInfo=tuple(state['fishingInfo']))
  for k,v in values.items():
   if k in prog:prog[k].value=v
  if 'lightningSegments' in prog:prog['lightningSegments'].write(array.array('f',bolt_segments if bolt_segments is not None else state.get('lightning',[0]*72)).tobytes())
  if 'birdStates' in prog:prog['birdStates'].write(array.array('f',birds if birds is not None else state.get('birds',[0]*36)).tobytes())
  if 'fishStates' in prog:prog['fishStates'].write(array.array('f',state['fish']).tobytes())
 (dark_vao if no_solar else vao).render();cvao.render();pvao.render(moderngl.POINTS)
 if rain and (weather[2]>.001 or weather[3]*season[3]>.001):
  ctx.enable(moderngl.BLEND);ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA;rvao.render();ctx.disable(moderngl.BLEND)
 return Image.frombytes('RGB',(480,270),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)

# This is EGL/offscreen shader QA, not a browser or physical-phone test.
from PIL import ImageChops
frames=state['frames']
def frame_render(frame,**kw):
 w=frame['state']
 return render(season=frame['season'],t=w['age']*.65,weather=w['values'],wm=(w['age'],w['drift'],w['windPhase'],w['snowCover']),wf=(w['wind'],w['windTravel']),**kw)
wet_count=0
for f in frames:
 im=frame_render(f)
 if f['state']['values'][2]+f['state']['values'][3]>.01:
  # Disable ALL direct celestial lighting as a control. Every pixel must be unchanged.
  for day in [3,15,27,45]:
   normal=frame_render(f,day=day);control=frame_render(f,day=day,no_solar=True)
   assert ImageChops.difference(normal,control).getbbox() is None,(f['name'],f['seconds'],day)
   wet_count+=1
 im.resize((960,540),Image.Resampling.NEAREST).save(out/(f['name']+'-'+str(f['seconds']).zfill(2)+'.png'))
for name in ['rain','snow','rain-clearing','snow-clearing']:
 selected=[f for f in frames if f['name']==name]
 sheet=Image.new('RGB',(480*4,294*2),(12,28,37));draw=ImageDraw.Draw(sheet)
 for i,f in enumerate(selected):
  x=(i%4)*480;y=(i//4)*294;sheet.paste(frame_render(f),(x,y));w=f['state']
  draw.text((x+8,y+274),f"{name} {f['seconds']}s | cover {w['values'][0]:.2f} | wet {sum(w['values'][2:]):.2f}",fill='white')
 sheet.save(out/(name+'-sequence.png'))
wind_sheet=Image.new('RGB',(960,588),(12,28,37));draw=ImageDraw.Draw(wind_sheet)
for i,name in enumerate(['calm','wind']):
 for j,seconds in enumerate([20,30]):
  f=next(f for f in frames if f['name']==name and f['seconds']==seconds)
  wind_sheet.paste(frame_render(f),(j*480,i*294));draw.text((j*480+8,i*294+274),f'{name} {seconds}s',fill='white')
wind_sheet.save(out/'wind-field-comparison.png')
# Verify that the control is meaningful: on a clear day the disc and water path DO differ.
clear=next(f for f in frames if f['name']=='calm' and f['seconds']==20)
diff=ImageChops.difference(frame_render(clear),frame_render(clear,no_solar=True))
assert diff.crop((220,24,260,54)).getbbox() is not None,'sun positive control missing'
assert diff.crop((180,212,300,245)).getbbox() is not None,'water reflection positive control missing'
# All four seasonal palettes and night lighting still compile and render.
for i,name in enumerate(['spring','summer','autumn','winter']):
 for day,label in [(15,'day'),(45,'night')]:
  im=render(season=tuple(int(j==i) for j in range(4)),day=day,snow=.7 if i==3 else 0)
  im.resize((960,540),Image.Resampling.NEAREST).save(out/(name+'-'+label+'.png'))
assert ctx.error=='GL_NO_ERROR',ctx.error
print(f'PASS: all {4 if rain else 3} shader programs compile/link; {len(frames)} transition renders; {wet_count} full-frame rain/snow/clearing solar-absence controls at dawn/noon/dusk/night; clear sun + water reflection positive controls; four seasons day/night; GL_NO_ERROR.')
