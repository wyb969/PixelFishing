"""Current four-pass EGL smoke test; emits PNGs, not a browser/video test."""
from render_engine import load_engine, ROOT
from PIL import ImageChops
E=load_engine();render=E['render'];out=ROOT/'analysis';out.mkdir(exist_ok=True)
images=[render(t=t) for t in [3,6,9,12]]
assert images[0].tobytes()!=images[1].tobytes(),'Animation must change'
for t,im in zip([3,6,9,12],images):im.save(out/f'coast-current-{t}.png')
assert render(wf=(0,0)).tobytes()!=render(wf=(2,0)).tobytes(),'Wind/waves must change'
for day,label in [(0,'dawn'),(15,'day'),(30,'dusk'),(45,'night')]:render(day=day).save(out/f'coast-current-{label}.png')
assert render(day=15).tobytes()!=render(day=45).tobytes()
assert ImageChops.difference(render(day=0),render(day=60)).getbbox() is None
render(weather=(1,.7,1,0),day=45).save(out/'coast-current-rain.png')
assert E['ctx'].error=='GL_NO_ERROR'
print('PASS: current four-pass shaders, animation, wind/waves, day/night and 60s lighting loop. PNG previews in analysis. EGL only; no browser/mobile/video validation.')
