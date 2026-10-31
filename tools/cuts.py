import json,numpy as np,subprocess,soundfile as sf
P=__import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
T=json.load(open('takes.json'))
SR=48000
aud={f:sf.read(f'{P}/voice/raw_{f}.wav')[0] for f in range(8)}
def env(x):
    hop=SR//200  # 5ms
    n=len(x)//hop
    return np.sqrt((x[:n*hop].reshape(n,hop)**2).mean(1)+1e-12)
E={f:env(aud[f]) for f in aud}
def lowpoint(f,a,b):
    e=E[f]; ia=max(0,int(a*200)); ib=min(len(e)-1,int(b*200))
    if ib<=ia: return (a+b)/2
    sm=np.convolve(e,np.ones(16)/16,'same')
    return (ia+int(np.argmin(sm[ia:ib+1])))/200
# boundaries
for i,t in enumerate(T):
    f=t['file']
    prev=T[i-1] if i>0 and T[i-1]['file']==f else None
    nxt=T[i+1] if i+1<len(T) and T[i+1]['file']==f else None
    t['c0']=lowpoint(f,prev['asr_t1']-0.25,t['asr_t0']+0.15) if prev else max(0,t['asr_t0']-0.6)
    t['c1']=lowpoint(f,t['asr_t1']-0.15,nxt['asr_t0']+0.25) if nxt else min(len(aud[f])/SR,t['asr_t1']+0.8)
# 手工修正的切点（成片审听发现的串音）：L8 不要截掉「字」，L9 从「欸」开始；L22/L24 去掉被替换的旧 L23 的头尾
OVR = {8: (None, 34.40), 9: (34.60, None), 22: (None, 49.80), 24: (54.80, None)}
for t in T:
    if t['id'] in OVR:
        a, b = OVR[t['id']]
        if a is not None: t['c0'] = a
        if b is not None: t['c1'] = b
    if t['id'] == 104: t['c0'] = 0; t['c1'] = len(aud[7]) / SR
# L23 -> pickup file 6
for t in T:
    if t['id']==23:
        t['file']=6; t['c0']=0; t['c1']=len(aud[6])/SR; t['text']='走近才认出来：那是他自己的画，只是侧着靠在了墙上。'
import os; os.makedirs(f'{P}/voice/lines',exist_ok=True)
for t in T:
    f=t['file']; x=aud[f][int(t['c0']*SR):int(t['c1']*SR)]
    e=env(x); fl=max(np.percentile(E[f],8)*5,0.004)
    on=np.where(e>fl)[0]
    a=max(0,on[0]-12) if len(on) else 0   # 60ms pre-pad
    b=min(len(e),on[-1]+30) if len(on) else len(e)  # 150ms tail
    y=x[a*SR//200:b*SR//200].copy()
    fi=int(.008*SR); fo=int(.03*SR)
    y[:fi]*=np.linspace(0,1,fi); y[-fo:]*=np.linspace(1,0,fo)
    sf.write(f"{P}/voice/lines/L{t['id']:03d}.wav",y,SR,subtype='PCM_16')
    t['dur']=round(len(y)/SR,3); t['src0']=round(t['c0']+a/200,3)
json.dump(T,open('takes.json','w'),ensure_ascii=False,indent=1)
print('total speech',round(sum(t['dur'] for t in T),1))
for t in T: print(t['id'],t['dur'],t['text'][:20])
