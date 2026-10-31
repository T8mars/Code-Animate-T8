# 用法: python3 queue.py <a> <b> <chunk_s> <workers> <outdir>
import sys,subprocess,os,math
from concurrent.futures import ThreadPoolExecutor
a,b,cs,nw,out=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]),int(sys.argv[4]),sys.argv[5]
os.makedirs(out,exist_ok=True)
ch=[];t=a
splits=[float(x) for x in os.environ.get('SPLITS','').split(',') if x]  # 不可切开的镜头起点：在此强制断开且其后到 b 为一整块
solo=float(os.environ.get('SOLO','1e9'))
while t<b-1e-6:
    if t>=solo-1e-6: ch.append((round(t,3),round(b,3))); break
    e=min(b,t+cs,solo); ch.append((round(t,3),round(e,3))); t=e
def run(c):
    fn=f'{out}/c_{c[0]:08.3f}.mp4'
    if os.path.exists(fn+'.done'): return
    subprocess.run(['node','render.js',str(c[0]),str(c[1]),fn],cwd=os.path.dirname(os.path.abspath(__file__)))
with ThreadPoolExecutor(nw) as ex: list(ex.map(run,ch))
print('ALL DONE',out)
