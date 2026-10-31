import glob,os,re,json
P=__import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
code=[f for f in glob.glob(f'{P}/film/*.js') if not re.search(r'(music_env|timeline)\.js$',f) and 'node_modules' not in f]+glob.glob(f'{P}/*.py')+glob.glob(f'{P}/align/*.py')+glob.glob(f'{P}/film/*.html')+glob.glob(f'{P}/film/rq.py')
lines=sum(len(open(f,errors='ignore').read().split('\n')) for f in code)
# 渲染时长：每个块最后一次报告的 ms/帧 × 帧数
ms=0; logs=[]
for lg in glob.glob(f'{P}/render/*.log'):
    last={}
    for l in open(lg,errors='ignore'):
        m=re.match(r'(\S+\.mp4) (\d+) / (\d+) (\d+) ms/f',l.strip())
        if m: last[m.group(1)]=(int(m.group(3)),int(m.group(4))); logs.append(l.strip())
    for fn,(f1,msf) in last.items():
        f0=int(round(float(os.path.basename(fn)[2:-4])*30)); ms+=(f1-f0)*msf
hours=round(ms/3.6e6,1)
logs=[re.sub(r'^\S*/','',l) for l in logs[-40:]]
st={'lines':lines,'hours':hours,'where':'云端 2 核 CPU · 软件渲染','log':logs[:30],'files':len(code)}
open(f'{P}/film/stats.js','w').write('const STATS='+json.dumps(st,ensure_ascii=False)+';')
print(lines,hours,len(code))
