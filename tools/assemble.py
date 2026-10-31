"""用法: python3 assemble.py <名称> <a> <b> <dirs...>   把渲染块拼好，烧字幕、混音，输出 out/<名称>.mp4"""
import sys, glob, os, subprocess, json
P = __import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
name, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); dirs = sys.argv[4:]
chunks = []
for d in dirs:
    for f in glob.glob(f'{P}/render/{d}/c_*.mp4'):
        if os.path.exists(f + '.done'): chunks.append((float(os.path.basename(f)[2:-4]), f))
chunks.sort()
sel = [c for c in chunks if c[0] < b - 1e-3]
# 连续性检查
os.makedirs(f'{P}/out', exist_ok=True)
lst = f'{P}/out/{name}_list.txt'; open(lst, 'w').write(''.join(f"file '{f}'\n" for _, f in sel))
t0 = sel[0][0]
print('chunks', len(sel), 'from', t0)
# 字幕平移到片段起点
ass = open(f'{P}/subs.ass').read().split('\n')
def sh(ts, d):
    h, m, s = ts.split(':'); x = int(h) * 3600 + int(m) * 60 + float(s) - d
    if x < 0: return None
    return f'{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}'
out = []
for l in ass:
    if l.startswith('Dialogue:'):
        p = l.split(',', 9); s, e = sh(p[1], a), sh(p[2], a)
        if s is None or e is None or float(p[1].split(':')[2]) + int(p[1].split(':')[1]) * 60 + int(p[1].split(':')[0]) * 3600 > b: continue
        p[1], p[2] = s, e; l = ','.join(p)
    out.append(l)
open(f'{P}/out/{name}.ass', 'w').write('\n'.join(out))
dur = b - a
cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-ss', f'{a - t0:.3f}', '-t', f'{dur:.3f}',
       '-ss', f'{a:.3f}', '-t', f'{dur:.3f}', '-i', f'{P}/audio_mix.wav',
       '-map', '0:v', '-map', '1:a', '-vf', f"ass={P}/out/{name}.ass", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', f'{P}/out/{name}.mp4']
subprocess.run(cmd, check=True); print('ok', f'{P}/out/{name}.mp4')
