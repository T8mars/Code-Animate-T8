import json,sys,time,urllib.request,os
KEY=open(os.path.expanduser('~/.config/seedance/key')).read().strip()
B='https://api.seedance.nz'
def req(path,body=None):
    r=urllib.request.Request(B+path,data=json.dumps(body).encode() if body else None,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json','User-Agent':'curl/8.5.0','Accept':'*/*'},method='POST' if body else 'GET')
    return json.load(urllib.request.urlopen(r,timeout=60))
jobs=json.load(open(sys.argv[1]))
tasks={}
for j in jobs:
    if os.path.exists(f"task_{j['name']}.json") or j.get('tid'):
        if j.get('tid'): tasks[j['name']]=j['tid']
        continue
    r=req('/v1/music/generations',{'model':'suno-generation','version':'v6','custom':True,'instrumental':True,'title':j['title'],'style':j['style'],'prompt':j['prompt']})
    print(json.dumps(r)[:400],flush=True)
    d=r.get('data'); d=d[0] if isinstance(d,list) else (d or {})
    tid=d.get('task_id') or d.get('id') or r.get('task_id')
    print('submit',j['name'],tid,flush=True); tasks[j['name']]=tid
while tasks:
    time.sleep(20)
    for n,t in list(tasks.items()):
        try: r=req(f'/v1/music/tasks/{t}')
        except Exception as e: print('poll err',n,e); continue
        d=r.get('data',{}); st=d.get('status'); 
        mus=(d.get('result') or {}).get('music') or []
        if mus and all(m.get('status')=='complete' for m in mus):
            json.dump(r,open(f'task_{n}.json','w'),ensure_ascii=False)
            for k,m in enumerate(mus):
                urllib.request.urlretrieve(m['audio_url'],f'{n}_{k}.mp3'); print('done',n,k,m['duration'],flush=True)
            del tasks[n]
        elif st in('failed','error') or any(m.get('status')=='error' for m in mus):
            print('FAIL',n,json.dumps(r)[:300]); del tasks[n]
