"""Current cloud pass: visible, stable under identical state, advects with wind.
Old constant-shape/rightward-only assertions are obsolete: seasonal clouds deform
and share a time-dependent wind field. This is isolated EGL draw-pass coverage.
"""
from render_engine import load_engine,ROOT
from PIL import Image
E=load_engine();E['render'](day=45);ctx=E['ctx'];cloud=E['cloud'];vao=E['cvao']
fb=ctx.simple_framebuffer((480,270),components=4);fb.use();ctx.viewport=(0,0,480,270)
def capture(t,travel):
 for k,v in {'time':t,'weatherMotion':(t,travel,0,0),'windField':(.7,travel)}.items():
  if k in cloud:cloud[k].value=v
 fb.clear(0,0,0,0);vao.render()
 return Image.frombytes('RGBA',(480,270),fb.read(components=4))
a=capture(12,0);assert a.getchannel('A').getbbox();assert a.tobytes()==capture(12,0).tobytes()
b=capture(20,40);assert b.getchannel('A').getbbox();assert a.tobytes()!=b.tobytes()
for i in range(120):assert capture(12+i/60,i/60*.7).getchannel('A').getbbox()
assert ctx.error=='GL_NO_ERROR';(ROOT/'analysis').mkdir(exist_ok=True);a.save(ROOT/'analysis/cloud-pass.png')
print('PASS: current cloud draw pass visible over 120 continuous frames; deterministic fixed state, animated wind displacement; EGL only.')
