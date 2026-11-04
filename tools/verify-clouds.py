"""Test the actual rectangle cloud draw pass, with fixed night lighting."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
code=(root/'tools/verify_render.py').read_text(encoding='utf-8-sig')
exec(compile(code.split("out=root/'analysis'")[0],str(root/'tools/verify_render.py'),'exec'))
fb=ctx.simple_framebuffer((960,270),components=4);fb.use();ctx.viewport=(0,0,960,270)
for key,value in dict(resolution=(960,270),dayTime=45.,pan=0.,tilt=0.,zoom=1.).items():
 if key in clouds:clouds[key].value=value
checks=0
for cloud_id in range(3):
 baseline=None;last_x=None
 for frame in range(360):
  clouds['time'].value=frame/60.;fb.clear(0,0,0,0);cloud_vao.render(vertices=36,first=cloud_id*36)
  im=Image.frombytes('RGBA',(960,270),fb.read(components=4));box=im.getchannel('A').getbbox()
  assert box,'Cloud disappeared'
  tile=im.crop(box);signature=(tile.size,tile.tobytes())
  if baseline is None:baseline=signature
  assert signature==baseline,'Cloud shape or brightness changed under fixed light'
  if last_x is not None:assert 0<=box[0]-last_x<=1,'Cloud must move slowly rightward'
  last_x=box[0];checks+=1
print(json.dumps({'continuous_frames':checks,'constant_shape_and_brightness':'passed','rightward_motion':'passed','gl_error':ctx.error}))
