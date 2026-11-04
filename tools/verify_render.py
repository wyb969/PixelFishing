"""Compile and render the production shader sources on the local GPU, without a browser."""
from pathlib import Path
import sys,math,array,json
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.tools/python'))
import moderngl,av
from PIL import Image,ImageDraw
ctx=moderngl.create_standalone_context()
motion=json.loads((root/'analysis/motion-frames.json').read_text())
folder=root/'dist/shaders'; common=(folder/'common.glsl').read_text()
def source(text,vertex=False):
 text=text.replace('precision highp float;','').replace('attribute ','in ').replace('varying ','out ' if vertex else 'in ')
 if not vertex:text='out vec4 fragColor;\n'+text.replace('gl_FragColor','fragColor')
 return '#version 330\n'+text
bg=ctx.program(vertex_shader=source('attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',True),fragment_shader=source(common+(folder/'environment.frag').read_text()))
points=ctx.program(vertex_shader=source(common+(folder/'particles.vert').read_text(),True),fragment_shader=source((folder/'particles.frag').read_text()))
clouds=ctx.program(vertex_shader=source(common+(folder/'clouds.vert').read_text(),True),fragment_shader=source(common+(folder/'clouds.frag').read_text()))
cloud_data=json.loads((root/'analysis/cloud-geometry.json').read_text())
cloud_buffer=ctx.buffer(array.array('f',cloud_data).tobytes());cloud_vao=ctx.vertex_array(clouds,[(cloud_buffer,'2f 2f 3f','center','offset','color')])
quad=ctx.buffer(array.array('f',[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]).tobytes());vao=ctx.vertex_array(bg,[(quad,'2f','position')])
data=[]
for step,rows,kind in [(1.7,23,0),(6.8,24,1),(2.6,1,2)]:
 x=-70.
 while x<550:
  for j in range(rows):data.extend([x,j/rows if kind<2 else math.fmod(math.sin(x*127.1)*43758.5453,1)+1,kind])
  x+=step
buf=ctx.buffer(array.array('f',data).tobytes());pvao=ctx.vertex_array(points,[(buf,'3f','particle')]);ctx.enable(moderngl.PROGRAM_POINT_SIZE)
fbo=ctx.simple_framebuffer((480,270));fbo.use();ctx.viewport=(0,0,480,270)
def render(t,strength=.18,day_time=15):
 state=motion[min(len(motion)-1,max(0,int(t*15)))]
 for prog in [bg,points,clouds]:
  for key,value in dict(resolution=(480,270),time=t,dayTime=day_time,strength=strength,pan=0.,tilt=0.,zoom=1.,natureSeed=0.).items():
   if key in prog:prog[key].value=value
  if 'boat' in prog:prog['boat'].value=tuple(state['boat'])
  if 'tackle' in prog:prog['tackle'].value=tuple(state.get('tackle',[350,232,0,0]))
  if 'fishingInfo' in prog:prog['fishingInfo'].value=tuple(state.get('fishingInfo',[-1,0,0,1]))
  if 'fishStates' in prog:prog['fishStates'].write(array.array('f',state['fish']).tobytes())
 vao.render();cloud_vao.render();pvao.render(moderngl.POINTS)
 return Image.frombytes('RGB',(480,270),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
out=root/'analysis';out.mkdir(exist_ok=True)
ims=[]
for t in [3,6,9,12]:
 im=render(t);ims.append(im);im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'coast-v5-{t}.png')
assert ims[0].tobytes()!=ims[1].tobytes(),'Animation must change the frame'
assert render(3,.4).tobytes()!=render(3,1.8).tobytes(),'Wave strength must affect the render'
assert ctx.error=='GL_NO_ERROR',ctx.error
sheet=Image.new('RGB',(960,580));labels=ImageDraw.Draw(sheet)
for i,(day_time,name) in enumerate([(0,'06:00 SUNRISE'),(15,'12:00 NOON'),(30,'18:00 SUNSET'),(45,'00:00 NIGHT')]):
 im=render(12,day_time=day_time);sheet.paste(im,(i%2*480,i//2*290));labels.text((i%2*480+10,i//2*290+273),name,fill='white')
sheet.save(out/'day-cycle.jpg')
assert render(12,day_time=15).getpixel((240,80))!=render(12,day_time=45).getpixel((240,80)),'Sky must change with daylight'
assert render(12,day_time=15).getpixel((350,233))!=render(12,day_time=45).getpixel((350,233)),'Water must change with daylight'
assert render(12,day_time=0).tobytes()==render(12,day_time=60).tobytes(),'Lighting must loop seamlessly every 60 seconds'
fishing_sheet=Image.new('RGB',(960,580));fishing_labels=ImageDraw.Draw(fishing_sheet)
for n,(stage,label) in enumerate([(1,'CAST'),(3,'CHASE'),(4,'FIGHT'),(5,'LAND')]):
 matches=[i for i,s in enumerate(motion) if s.get('tackle',[0,0,0])[2]==stage]
 if matches:
  idx=matches[min(len(matches)-1,20)];im=render((idx+.1)/15)
  im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'fishing-stage-{stage}.png')
  fishing_sheet.paste(im,(n%2*480,n//2*290));fishing_labels.text((n%2*480+10,n//2*290+273),label,fill='white')
fishing_sheet.save(out/'fishing-stages.jpg')
with av.open(str(out/'coast-fishing.mp4'),'w') as video:
 stream=video.add_stream('libx264',rate=15);stream.width=960;stream.height=540;stream.pix_fmt='yuv420p';stream.options={'crf':'18'}
 for i in range(900):
  im=render(3+i/15,day_time=i/15+7.5).resize((960,540),Image.Resampling.NEAREST)
  for packet in stream.encode(av.VideoFrame.from_image(im)):video.mux(packet)
 for packet in stream.encode():video.mux(packet)
print(json.dumps({'renderer':ctx.info['GL_RENDERER'],'particles':len(data)//3,'shader_compile':'passed','animation':'passed','wave_strength':'passed','day_night':'passed','60_second_loop':'passed','gl_error':ctx.error,'preview':'analysis/coast-fishing.mp4'}))




