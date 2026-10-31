import json,librosa,numpy as np
P=__import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
plan=json.load(open(f'{P}/music_plan.json'))['cues']
B=json.load(open(f'{P}/music/beats.json'))
tot=json.load(open(f'{P}/timeline.json'))['total']
nf=int(tot*30)+30; env=np.zeros(nf); beats=[]; onset=np.zeros(nf)
for c in plan:
    y,sr=librosa.load(f"{P}/music/{c['track']}.mp3",sr=22050)
    hop=735  # 30fps
    r=librosa.feature.rms(y=y,frame_length=2048,hop_length=hop)[0]
    o=librosa.onset.onset_strength(y=y,sr=sr,hop_length=hop)
    f0=int(c['film']*30); f1=int(c['end']*30); s0=int(c['src']*30)
    for f in range(f0,min(f1,nf)):
        k=s0+f-f0
        if k<len(r): env[f]=max(env[f],r[k]); onset[f]=max(onset[f],o[k] if k<len(o) else 0)
    for bt in B[c['track']+'.mp3']['beats']:
        ft=c['film']+bt-c['src']
        if c['film']<=ft<c['end']: beats.append(round(ft,3))
env=env/ (np.percentile(env[env>0],98)+1e-9); onset=onset/(np.percentile(onset[onset>0],98)+1e-9)
open(f'{P}/film/music_env.js','w').write('const MENV='+json.dumps([round(float(min(1.5,v)),3) for v in env])+';\nconst MONS='+json.dumps([round(float(min(2,v)),3) for v in onset])+';\nconst MBEATS='+json.dumps(sorted(beats))+';\n')
print('beats',len(beats))
