"""全片混音：口播 + 按幕配乐（压在口播下）+ 音效 → -14 LUFS"""
import json, numpy as np, soundfile as sf, subprocess, os, sys
P = __import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
SR = 48000
TL = json.load(open(f'{P}/timeline.json')); tot = TL['total']
N = int((tot + 1) * SR)
# 音效跟画面走：画面按第一版句子时刻对齐，所以这里也用第一版
VL = {**TL['lines'], **json.load(open(f'{P}/timeline_r1.json'))['lines']} if os.path.exists(f'{P}/timeline_r1.json') else TL['lines']
LS = lambda i: VL[str(i)][0]; LE = lambda i: VL[str(i)][1]
def GP(label, after=0): return next(g for g in TL['gaps'] if g[2] == label and g[0] >= after - 1e-3)
def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
db = lambda x: 10 ** (x / 20)
# ---- 口播 ----
v, _ = sf.read(f'{P}/voice/voice_track.wav'); v = np.asarray(v, np.float32)
voice = np.zeros((N, 2), np.float32); voice[:len(v), 0] = v[:N]; voice[:len(v), 1] = v[:N]
# 口播处理：高通 + 轻压缩（用 ffmpeg）
sf.write('/tmp/v_in.wav', voice.astype(np.float32), SR)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/tmp/v_in.wav', '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3dB,loudnorm=I=-16:TP=-2:LRA=7', '-ar', str(SR), '/tmp/v_proc.wav'])
voice = load('/tmp/v_proc.wav')[:N]
if len(voice) < N: voice = np.vstack([voice, np.zeros((N - len(voice), 2))])
# ---- 配乐 ----
music = np.zeros((N, 2), np.float32)
plan = json.load(open(f'{P}/music_plan.json'))['cues']
cache = {}
for c in plan:
    tr = cache.setdefault(c['track'], load(f"{P}/music/{c['track']}.mp3"))
    s0 = int(c['src'] * SR); f0 = int(c['film'] * SR); f1 = int(c['end'] * SR)
    seg = tr[s0:s0 + (f1 - f0)].copy(); n = len(seg)
    fi = int(c['fin'] * SR); fo = int(c['fout'] * SR)
    if fi: seg[:min(fi, n)] *= np.linspace(0, 1, min(fi, n))[:, None]
    if fo: seg[max(0, n - fo):] *= np.linspace(1, 0, min(fo, n))[:, None]
    seg *= db(c.get('gain', 0))
    music[f0:f0 + n] += seg[:N - f0]
# 音乐响度对齐到 -18 LUFS 左右（粗略：按 RMS）
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
music *= db(-19) / max(rms(music[music.any(1)]), 1e-6)
# ---- 闪避：口播在时音乐压低 ----
env = np.abs(voice[:, 0]); hop = SR // 100
e = np.array([env[i:i + hop].max() for i in range(0, N, hop)])
act = (e > 0.02).astype(float)
# 起音 60ms、释放 450ms
g = np.zeros_like(act); cur = 0
for i, a in enumerate(act):
    cur = cur + (a - cur) * (0.6 if a > cur else 0.022); g[i] = cur
duck = 1 - 0.62 * g   # 约 -8.4 dB
duck = np.repeat(duck, hop)[:N]
music *= duck[:, None]
# ---- 音效 ----
SFX = __import__('os').environ.get('FILM_SFX', './sfx')
sfx = np.zeros((N, 2), np.float32); sc = {}
def hit(t, name, gain=-14, rate=1.0):
    path = f'{SFX}/{name}.wav'
    if not os.path.exists(path): print('missing', name); return
    x = sc.setdefault((name, rate), load(path, int(SR / rate)))
    i = int(t * SR); n = min(len(x), N - i)
    if n > 0 and i >= 0: sfx[i:i + n] += x[:n] * db(gain)
ev = []
# 冷开场
ev += [(0.02, 'typing/typing_01', -16), (LS(2), 'pop/pop_03', -8)]
for k in range(40):
    born = LS(3) + ((k + 1) / 40) ** (1 / 1.6) * (LE(3) - LS(3) - .5); ev.append((born, f'pop/pop_0{k % 7 + 1}', -15 - (k % 3)))
ev += [(LS(4) + 1.2, 'tick/tick_02', -14), (LS(5) + .3, 'whoosh/whoosh_02', -12), (GP('twenty frames')[0] - 2.2, 'riser/riser_01', -14)]
for k in range(1, 20): ev.append((GP('twenty frames')[0] + k * 60 / 99.4 * 2, 'whoosh_fast/whoosh_fast_01', -19))
ev += [(GP('twenty frames')[1], 'soft_impact/soft_impact_01', -8), (LS(7), 'typing/typing_02', -16), (LS(7) + 2.5, 'typing/typing_03', -17),
       (GP('edit number')[0], 'typing/typing_01', -15), (GP('edit number')[0] + .5, 'riser/riser_02', -13), (GP('deflate')[0], 'pop/pop_06', -6),
       (LS(11) + 2, 'swell/swell_01', -16), (LS(12) + 2.2, 'glitch/glitch_01', -16), (GP('title')[0] + 3.0, 'braam/braam_01', -9), (GP('title')[0] + 3.2, 'shimmer/shimmer_01', -14)]
# 第一幕
ev += [(SEG := TL['segs'][1][1], 'paper/paper_01', -14), (SEG + 3.2, 'swell/swell_02', -15)]
sun_cut = LE(13) - 1.2; ev += [(sun_cut, 'ding/ding_04', -14)]
ev += [(LS(16) + .3, 'stamp/stamp_01', -10), (LS(20) + .4, 'stamp/stamp_02', -10), (LS(24) + .4, 'stamp/stamp_01', -10), (LS(27) + .4, 'stamp/stamp_02', -10)]
ev += [(GP('silent film')[0] + x, 'scratch/scratch_01', -20) for x in (0, 8.5, 12.2, 17.4)]
ev += [(GP('reveal')[0] - .6, 'whoosh/whoosh_01', -14), (LS(28), 'scratch/scratch_01', -14), (GP('act1 finale')[1] - 3.2, 'riser/riser_01', -12), (GP('act1 finale')[1] - .3, 'glitch/glitch_01', -12)]
# 第二幕
a2 = TL['segs'][2][1]
ev += [(a2, 'braam/braam_01', -14), (LS(31) + .4, 'stamp/stamp_01', -10), (LS(36) + 1.6, 'stamp/stamp_02', -10), (LS(39) + 1.2, 'ding/ding_02', -12)]
ot = GP('one take noise')[0]
for q in range(2, 8): ev.append((ot + 10 + (q - 1) * 9 / 6, 'tick/tick_01', -14))
for x in (20.5, 23.2, 26.2, 29.2, 32.2): ev.append((ot + x, 'whoosh_fast/whoosh_fast_02', -16))
ev += [(LS(41) - .2, 'ding/ding_05', -12), (466.0 - 2.5, 'riser/riser_02', -12), (466.0, 'hit/hit_01', -6), (466.0, 'braam/braam_01', -10)]
# 第三幕
a3 = TL['segs'][3][1]
ev += [(a3, 'glitch/glitch_01', -12), (LS(46) + .5, 'stamp/stamp_01', -10), (LS(49) + .4, 'stamp/stamp_02', -10), (LS(57) + 3.2, 'stamp/stamp_01', -10),
       (GP('fractal')[0] + 26, 'glitch/glitch_01', -14), (LS(56) + 1.6, 'glitch/glitch_01', -12), (LS(59) - .3, 'glitch/glitch_01', -8)]
# 第四幕
a4 = TL['segs'][4][1]
ev += [(a4 + 3, 'typing/typing_02', -16), (a4 + 5, 'riser/riser_01', -16), (LS(66), 'ding/ding_01', -12), (LS(67) + 1.5, 'ding/ding_03', -14),
       (GP('guess vs write')[0] + 9.5, 'typing/typing_03', -15), (GP('2026')[0] + 2, 'typing/typing_01', -17)]
il = GP('iteration log'); per = (il[1] - il[0]) / 7
for k in range(7): ev.append((il[0] + k * per, 'click/click_01', -12))
ev += [(LS(74) + .3, 'shimmer/shimmer_01', -14), (LS(76), 'swell/swell_01', -12), (GP('preview lights')[0] + .5, 'ding/ding_06', -12), (LS(77), 'typing/typing_02', -17), (LS(78), 'typing/typing_03', -17),
       (GP('chars fall')[0], 'whoosh/whoosh_03', -12), (GP('text city')[0] + 62.6, 'soft_impact/soft_impact_02', -10), (GP('text city')[0] + 78, 'whoosh/whoosh_01', -12)]
# 尾声
for i in (84, 85, 86, 87): ev.append((LS(i) - .1, 'click/click_02', -14))
ev += [(LS(89), 'shimmer/shimmer_01', -15), (LS(94) + 1.6, 'scratch/scratch_01', -12), (LS(97), 'stamp/stamp_01', -10), (LS(97) + 1.2, 'stamp/stamp_02', -10), (LS(100), 'typing/typing_01', -16)]
fin_back = LS(102) + .2
for k in range(20): ev.append((fin_back + k * .3, 'whoosh_fast/whoosh_fast_01', -20))
ev += [(LE(103) + .3, 'shimmer/shimmer_02', -14)]
for t, n, gdb in ev: hit(t, n, gdb)
# 纯噪点那几秒：垫一层低电平的电视雪花声（滤过的白噪声）
rng = np.random.default_rng(7); a0, a1 = int(678.9 * SR), int(687.6 * SR)
nz = rng.standard_normal((a1 - a0, 2)).astype(np.float32)
nz = np.cumsum(nz, axis=0) * 0.02; nz -= np.convolve(nz[:, 0], np.ones(480) / 480, 'same')[:, None]  # 去掉低频漂移
env = np.minimum(1, np.minimum(np.arange(a1 - a0) / (0.3 * SR), (a1 - a0 - np.arange(a1 - a0)) / (1.2 * SR)))[:, None]
nz = nz / (np.abs(nz).max() + 1e-6) * db(-24) * env; sfx[a0:a1] += nz
# ---- 合成 ----
mix = voice * db(0) + music + sfx
sf.write(f'{P}/audio_mix_raw.wav', mix.astype(np.float32), SR)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{P}/audio_mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-ar', '48000', '-c:a', 'pcm_s16le', f'{P}/audio_mix.wav'])
print('mix done', round(tot, 1), 's')
