"""Master timeline: voice placement + pure-visual gaps -> timeline.json / timeline.js / voice.wav / subs.ass"""
import json, re, numpy as np, soundfile as sf, jieba
for w in ['停下来', '动起来', '莱恩·莱', '英国邮政', 'Monster Movie', '《Monster Movie》', '演示场景', '一行一行', '指挥仪', '文字之城', '画面动起来']: jieba.add_word(w, 10000)
P = __import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
T = {t['id']: t for t in json.load(open(f'{P}/align/takes.json'))}
SR = 48000
# ('seg',name) starts a segment; ('g',sec,label) pure gap; int = line id (default gap .45 before next line)
# ('L',id,pre) line with explicit pre-gap
SPEC = [
 ('seg', 'cold'),
 ('g', 0.9, 'prompt typing'), 1, ('L', 2, .55), ('L', 3, .5), ('L', 4, .45), ('L', 5, .5),
 ('g', 23.0, 'twenty frames'),
 ('L', 6, .2), ('L', 7, .35), ('L', 8, .5), ('g', 1.4, 'edit number'), ('L', 9, 0), ('g', 0.8, 'deflate'),
 ('L', 10, .4), ('L', 11, .7), ('L', 12, .5), ('g', 7.0, 'title'),
 ('seg', 'a1'),
 ('g', 3.0, 'act card'), ('g', 1.6, 'sun'), 13, ('L', 14, .7), ('g', 2.2, 'slit tune'), 15, 16, 17, ('L', 18, .7), ('L', 19, .6), ('g', 2.6, 'slit to frame'),
 ('g', 30.0, 'silent film'), 20, 21, ('g', 11.0, 'paper stage'),
 ('g', 1.8, 'dusk'), 22, ('L', 23, .4), ('g', 1.6, 'reveal'), 24, ('L', 25, .6), ('g', 19.0, 'visual music'),
 ('L', 26, 1.0), 27, 28, ('g', 22.0, 'film scratch dance'),
 ('g', 24.0, 'act1 finale'),
 ('seg', 'a2'),
 ('g', 3.0, 'act card'), ('g', 2.0, 'gears'), 29, ('L', 30, .5), 31, ('L', 32, .5), 33, ('L', 34, .5), ('g', 34.0, 'harmonic cage'),
 ('L', 35, .5), 36, ('L', 37, .6), 38, ('g', 12.0, 'two curves'), 39, ('g', 36.0, 'one take noise'),
 40, 41, ('g', 4.0, 'medal'), ('g', 36.0, 'planet'), 42, ('L', 43, .5), ('g', 3.5, 'fade'),
 ('seg', 'a3'),
 ('g', 3.0, 'act card'), 44, 45, 46, ('g', 36.0, 'demo'),
 ('L', 47, .6), ('L', 48, .3), ('L', 49, .6), 50, ('L', 51, .6), 52, ('L', 53, .5), ('g', 30.0, 'fractal'),
 ('L', 54, .3), 55, 56, ('L', 57, .5), 58, ('g', 28.0, 'eats itself'), ('L', 59, .3), 60, ('g', 1.2, 'noise'),
 ('seg', 'a4'),
 ('g', 3.0, 'act card'), 61, 62, ('L', 63, .6), 64, ('L', 65, .7), ('L', 66, .3), ('L', 67, .7), ('L', 68, .7), ('L', 69, .4), ('g', 22.0, 'guess vs write'),
 ('g', 1.5, '2026'), 70, ('L', 71, .8), ('L', 72, .7), ('L', 73, .7), ('g', 25.0, 'iteration log'),
 ('L', 74, .6), ('L', 75, .6), ('L', 76, .8), ('g', 2.5, 'preview lights'), 77, ('L', 78, .7), ('g', 2.0, 'chars fall'),
 ('g', 82.0, 'text city'), ('L', 79, .3), ('g', 4.0, 'silence'),
 ('seg', 'end'),
 ('g', 1.0, 'river'), 80, ('L', 81, .8), ('L', 82, .8), ('L', 83, 1.0), ('L', 84, 1.2), ('L', 85, .9), ('L', 86, .9), ('L', 87, .9),
 ('L', 88, 1.4), ('L', 89, .9), ('L', 90, 1.0), ('g', 2.5, 'new painting'), ('L', 91, .2),
 ('L', 92, 1.6), ('L', 93, .8), ('L', 94, .8), ('L', 95, 1.2), ('L', 96, .8), ('L', 97, .8), ('L', 98, 1.4),
 ('L', 99, 1.6), ('L', 100, .6), ('L', 101, .8), ('g', 1.5, 'cards'),
 ('L', 102, 1.0), ('L', 103, .9), ('L', 104, 0), ('g', 22.0, 'pelican rides back + credits'),
 ('seg', 'fin'),
]
DEF_GAP = .45
t = 0.0; lines = {}; segs = []; gaps = []; prev_line = False
for it in SPEC:
    if isinstance(it, tuple) and it[0] == 'seg':
        if segs: segs[-1][2] = t
        segs.append([it[1], t, None]); prev_line = False; continue
    if isinstance(it, tuple) and it[0] == 'g':
        gaps.append([round(t, 3), round(t + it[1], 3), it[2]]); t += it[1]; prev_line = False; continue
    if isinstance(it, int): lid, pre = it, (DEF_GAP if prev_line else 0)
    else: _, lid, pre = it
    t += pre
    d = T[lid]['dur']; lines[lid] = [round(t, 3), round(t + d, 3)]; t += d; prev_line = True
segs = [s for s in segs if s[0] != 'fin']
total = segs[-1][2]
# ---- 第二轮：画面已按第一版时间线渲染好，这里把时间线钉死在第一版上 ----
# 重切过的句子：只改了尾巴的（L8、L22）保持开头时刻；只改了开头的（L9、L24）保持结尾时刻，这样每个字的位置都不变。
import os
if os.path.exists(f'{P}/timeline_r1.json'):
    R1 = json.load(open(f'{P}/timeline_r1.json'))
    segs, gaps, total = R1['segs'], R1['gaps'], R1['total']
    for lid in list(lines):
        if str(lid) not in R1['lines']: continue
        a0, b0 = R1['lines'][str(lid)]; d = T[lid]['dur']
        lines[lid] = [round(b0 - d, 3), b0] if lid in (9, 24) else [a0, round(a0 + d, 3)]
    # 新补的结尾句：落在「T8star × Claude」署名完全显出来的时候
    sig = R1['lines']['103'][1] + .3 + 5.6
    lines[104] = [round(sig, 3), round(sig + T[104]['dur'], 3)]
print('total %.1fs = %d:%05.2f' % (total, total // 60, total % 60))
for s in segs: print(f'  {s[0]:5s} {s[1]:7.2f} -> {s[2]:7.2f}  ({s[2]-s[1]:.1f}s)')

# voice track
v = np.zeros(int(total * SR) + SR)
for lid, (a, b) in lines.items():
    y, _ = sf.read(f'{P}/voice/lines/L{lid:03d}.wav'); i = int(a * SR); v[i:i + len(y)] += y
sf.write(f'{P}/voice/voice_track.wav', v, SR, subtype='PCM_16')

# per-line word timing (from source ASR), in clip-relative seconds
asr = {f: json.load(open(f'{P}/align/asr_{f}.json')) for f in range(8)}
def words_for(lid):
    tk = T[lid]; f = tk['file']; s0 = tk['src0']; d = tk['dur']
    return [(w, a - s0, b - s0) for w, a, b in asr[f] if a - s0 > -0.2 and b - s0 < d + 0.2]

# subtitle chunks: split script text at punctuation, max ~16 CJK chars per chunk
def chunks(text):
    text = re.sub(r'\s+', ' ', text).strip()
    parts = re.split(r'(?<=[，。：；？！、…])', text)
    mg = []
    for p in parts:
        if mg and mg[-1].count('《') > mg[-1].count('》'): mg[-1] += p
        else: mg.append(p)
    parts = mg
    out = []; cur = ''
    for p in parts:
        if not p: continue
        if len(cur) + len(p) <= 17 or not cur: cur += p
        else: out.append(cur); cur = p
        while len(cur) > 20:  # 长句按词切：只在词边界断开，不拆《》，优先在「的/了」后面
            words = list(jieba.cut(cur)); pos = []; acc_ = 0; depth = 0
            for w in words:
                depth += w.count('《') - w.count('》'); acc_ += len(w)
                if depth <= 0 and 5 <= acc_ <= len(cur) - 4: pos.append((acc_, w))
            mid = len(cur) / 2
            best = min(pos, key=lambda x: abs(x[0] - mid) - (3 if x[1][-1] in '的了，' else 0))[0] if pos else int(mid)
            out.append(cur[:best]); cur = cur[best:]
    if cur: out.append(cur)
    return out
def strip_tail(s): return re.sub(r'[，。：；、]+$', '', s).strip()
SUBS = []
for lid, (a, b) in sorted(lines.items(), key=lambda kv: kv[1][0]):
    text = T[lid]['text'].replace('难辩', '难辨').replace('cluade', 'Claude'); ch = chunks(text); n = sum(len(c) for c in ch); d = b - a
    W = words_for(lid)
    # map char index -> time using ASR word timings proportionally on spoken chars
    wt = []
    for w, ws, we in W:
        k = max(1, len(re.findall(r'[一-鿿]|[A-Za-z]+|\d', w)))
        for j in range(k): wt.append(ws + (we - ws) * j / k)
    pos = 0; acc = []
    for c in ch:
        frac = pos / n
        st = wt[int(frac * len(wt))] if wt and pos > 0 else 0
        acc.append([c, a + max(0, min(st, d - .3))]); pos += len(c)
    k = 0
    while k < len(acc) - 1:
        en = acc[k + 1][1]
        if en - acc[k][1] < 1.0 and len(acc[k][0]) + len(acc[k + 1][0]) <= 20: acc[k][0] += acc[k + 1][0]; del acc[k + 1]
        else: k += 1
    if len(acc) > 1 and b + .25 - acc[-1][1] < 1.0 and len(acc[-2][0]) + len(acc[-1][0]) <= 20: acc[-2][0] += acc[-1][0]; del acc[-1]
    for i, (c, st) in enumerate(acc):
        en = acc[i + 1][1] if i + 1 < len(acc) else b + 0.25
        SUBS.append([round(st, 3), round(en, 3), strip_tail(c), lid])
# enforce min dwell by extending into following silence
for i, s in enumerate(SUBS):
    need = len(s[2]) / 4.5 + 0.5 if False else 0.9
    nxt = SUBS[i + 1][0] if i + 1 < len(SUBS) else s[1] + 2
    if s[1] - s[0] < need: s[1] = min(nxt - 0.02, s[0] + need)
    s[1] = min(s[1] + 0.25, nxt - 0.02) if nxt - s[1] < 1.2 else s[1] + 0.25

json.dump(dict(total=total, segs=segs, lines=lines, gaps=gaps, subs=SUBS), open(f'{P}/timeline.json', 'w'), ensure_ascii=False, indent=0)
# 画面代码用第一版的句子时刻（已渲染的镜头都按它对齐），只多一句 L104
vis_lines = {**{int(k): v for k, v in R1['lines'].items()}, 104: lines[104]} if os.path.exists(f'{P}/timeline_r1.json') else lines
open(f'{P}/film/timeline.js', 'w').write('const TLD=' + json.dumps(dict(total=total, segs=segs, lines=vis_lines, gaps=gaps), ensure_ascii=False) + ';\n')

def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h}:{m:02d}:{s:05.2f}'
ass = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 2', '',
       '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
       'Style: Main,Noto Sans CJK SC Medium,58,&H00F0F4F6,&H00F0F4F6,&H78000000,&H00000000,0,0,0,0,100,100,2,0,3,9,0,2,120,120,48,1', '',
       '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
import sys; sys.path[:0] = [os.path.dirname(os.path.abspath(__file__)), f'{P}/align']; from en_subs import EN
for st, en, tx, lid in SUBS:
    e = EN[tx]; tx = tx.replace('「', '“').replace('」', '”')
    # 中文在上、英文在下，同一条字幕里换行，各自垫底
    ass.append(f'Dialogue: 0,{ts(st)},{ts(en)},Main,,0,0,0,,{{\\fad(90,120)}}{tx}\\N{{\\fs36\\bord7\\fsp0.5}}{e}')
def srt_t(x): return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}'
for name, f in (('subs_zh_en.srt', lambda tx: tx + '\n' + EN[tx]), ('subs_zh.srt', lambda tx: tx), ('subs_en.srt', lambda tx: EN[tx])):
    open(f'{P}/{name}', 'w').write(''.join(f'{i + 1}\n{srt_t(st)} --> {srt_t(en)}\n{f(tx)}\n\n' for i, (st, en, tx, lid) in enumerate(SUBS)))
open(f'{P}/subs.ass', 'w').write('\n'.join(ass) + '\n')
print('subs', len(SUBS), 'longest', max(len(s[2]) for s in SUBS))
