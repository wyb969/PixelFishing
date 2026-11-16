import sys, pathlib, time, json, statistics, math

from PIL import Image, ImageDraw, ImageChops, ImageStat
repo=pathlib.Path(__file__).resolve().parents[1]
baseline=pathlib.Path(sys.argv[1]).resolve()
states=pathlib.Path(sys.argv[2]).resolve()
out=pathlib.Path(sys.argv[3]).resolve();out.mkdir(exist_ok=True)
source=(repo/'tests/render_weather.py').read_text().split('# This is EGL/offscreen shader QA')[0]
def engine(root):
 ns={'__file__':str(root/'tests/render_weather.py')}
 sys.argv=['render_weather.py',str(states),str(out)]
 exec(source,ns)
 raw=ns['render']
 def activated_render(**kw):
  with ns['ctx']:
   ns['fbo'].use()
   return raw(**kw)
 ns['render']=activated_render
 return ns
old=engine(baseline);new=engine(repo)
def args(name,day):
 return dict(season=(0,0,0,1) if name=='snow' else (0,1,0,0),day=day,t=26,weather={'clear':(0,.12,0,0),'rain':(.92,.62,.85,0),'snow':(.88,.32,0,.85)}[name],snow=.85 if name=='snow' else 0,wm=(40,115,34,.85 if name=='snow' else 0),wf=(.26 if name=='snow' else .48 if name=='rain' else .10,15))
def lum(im,box):
 r,g,b=ImageStat.Stat(im.crop(box)).mean
 return .2126*r+.7152*g+.0722*b
sheet=Image.new('RGB',(1440,588),(12,28,37));draw=ImageDraw.Draw(sheet);metrics={}
for row,(day,label) in enumerate([(15,'day'),(45,'night')]):
 for col,name in enumerate(['clear','rain','snow']):
  a=args(name,day);im=new['render'](**a);before=old['render'](**a)
  im.resize((1440,810),Image.Resampling.NEAREST).save(out/f'{name}-{label}.png')
  sheet.paste(im,(col*480,row*294));draw.text((col*480+8,row*294+274),name+' '+label,fill='white')
  key=name+'-'+label
  metrics[key]={'sky_luminance':lum(im,(0,0,480,180)),'coast_luminance':lum(im,(0,212,480,264)), 'baseline_sky_luminance':lum(before,(0,0,480,180)), 'baseline_coast_luminance':lum(before,(0,212,480,264))}
  if name=='clear':assert ImageChops.difference(im,before).getbbox() is None,'clear rendering changed'
  if name!='clear' and day==15:
   assert metrics[key]['sky_luminance']<metrics[key]['baseline_sky_luminance']*.70
   assert metrics[key]['coast_luminance']<metrics[key]['baseline_coast_luminance']*.75
  if name!='clear' and day==45:
   assert metrics[key]['coast_luminance']>metrics[key]['baseline_coast_luminance']*.65,'night crushed'
sheet.save(out/'clear-rain-snow-day-night.png')
# Same-context, warmed native-grid renderer timings. Includes readback, no PNG encoding.
# EGL software timings are relative local checks, not physical mobile-GPU FPS.
bench={}
for name in ['clear','rain','snow']:
 bench[name]={}
 for label,ns in [('baseline',old),('updated',new)]:
  a=args(name,15)
  for _ in range(5):ns['render'](**a)
  batches=[]
  for repeat in range(5):
   start=time.perf_counter()
   for i in range(20):ns['render'](**{**a,'t':a['t']+i*.016})
   ns['ctx'].finish();batches.append((time.perf_counter()-start)/20*1000)
  bench[name][label+'_ms']=statistics.median(batches)
 bench[name]['ratio']=bench[name]['updated_ms']/bench[name]['baseline_ms']
report={'luminance':metrics,'egl_render_including_readback_ms':bench}
(out/'comparison-metrics.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
