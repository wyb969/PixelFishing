from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tools/python'))
import av
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
video=next(root.glob('*.mp4')); out=root/'analysis'; out.mkdir(exist_ok=True)
container=av.open(str(video)); stream=container.streams.video[0]
duration=float(stream.duration*stream.time_base)
print(json.dumps({'duration':duration,'width':stream.width,'height':stream.height,'fps':float(stream.average_rate)}))
times=[30,90,180,270,360,420,428,480,600,720,840,930]
def frame_at(t):
 container.seek(int(t/stream.time_base),stream=stream)
 for frame in container.decode(stream):
  if float(frame.pts*stream.time_base)>=t:return frame.to_image()
sheet=Image.new('RGB',(1200,4*250),'#172536'); d=ImageDraw.Draw(sheet)
for i,t in enumerate(times):
 im=frame_at(t);im.save(out/f'frame-{t}.jpg');im.thumbnail((400,225));x=i%3*400;y=i//3*250;sheet.paste(im,(x,y));d.text((x+6,y+227),f'{t//60:02}:{t%60:02}',fill='white')
sheet.save(out/'overview.jpg')
seq=Image.new('RGB',(1200,750));d=ImageDraw.Draw(seq)
for i in range(9):
 t=425+i*.5;im=frame_at(t);im.thumbnail((400,225));x=i%3*400;y=i//3*250;seq.paste(im,(x,y));d.text((x+6,y+227),f'{t:.1f}s',fill='white')
seq.save(out/'wave-sequence.jpg')
