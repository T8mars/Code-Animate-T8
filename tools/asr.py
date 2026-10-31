import sys,json,numpy as np,subprocess
from faster_whisper import WhisperModel
m=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2)
P=__import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
prompt='以下是普通话口播。术语：鹈鹕、SKILL、普拉托、梅里爱、康定斯基、莱恩·莱、惠特尼、佩林、Elevated、奎莱斯、Shadertoy、村田健、Monster Movie、Sora、可灵、即梦、海螺、Claude、64KB、4KB。'
for i in range(6):
    aud=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f'{P}/voice/raw_{i}.wav','-f','s16le','-ac','1','-ar','16000','-'],capture_output=True).stdout,np.int16).astype(np.float32)/32768
    segs,_=m.transcribe(aud,language='zh',word_timestamps=True,initial_prompt=prompt,vad_filter=False,condition_on_previous_text=False)
    W=[]
    for s in segs:
        for w in (s.words or []): W.append([w.word,round(w.start,3),round(w.end,3)])
    json.dump(W,open(f'{P}/align/asr_{i}.json','w'),ensure_ascii=False)
    print(i,len(W),''.join(w[0] for w in W)[:3000],flush=True)
