#!/usr/bin/env python3
"""voice_check.py —— 口播校对：把成片口播重新听写一遍，和剧本逐字对齐，找漏句、多余的声音（串音/重复）、首尾被切。

用法:
  python3 voice_check.py script.txt voice.wav          一整条合成好的口播（或成片导出的音轨）
  python3 voice_check.py script.txt voice/lines/       逐句 wav 所在文件夹（按文件名排序，文件名不需要和句子对应）
选项:
  --terms "鹈鹕,康定斯基,Shadertoy"   专有名词提示（只给术语，不要把整段剧本塞进去 —— 那会让识别「照着剧本猜」，掩盖真错误）
  --json report.json                  机器可读的报告
  --verbose                           逐句列出对齐结果（每句在哪个文件的几秒到几秒、听写成了什么）
  --cache asr.json                    缓存听写结果（第二次运行直接读，改剧本后重跑很快）
剧本格式: 一行一句，空行忽略；行首可写编号再接 Tab 或 |，例如 "L021|但从那以后，电影学会了变魔术。"

输出（人读）:
  [漏句]       剧本里有、音频里几乎找不到的句子（对上的字 < 40%）。
  [多余]       音频里有、剧本里没有的一串字。标「重复」的是和紧挨着的字一模一样的重复（如「走走」「墙边墙边」），
               多半是剪辑时片段重叠、或者补录和旧录音都留下了；不是重复的多余字，常见于混进了旧录音的半个字、口误。
  [开头被切] / [结尾被切]  这句话头一两个字 / 最后一两个字在听写里完全没有（不是识别成别的字，是没有声音）。
  [切点贴得太紧]  声学检查：逐句文件开头/结尾没有留白，或整条音轨里这句和上一句之间没有停顿 —— 很可能切在字中间。
  [句中缺字]   一句话中间连续 ≥2 个字没有声音。
  [听写不符]   这句话有声音，但大部分字识别得对不上（可能念错、录错版本，或识别差），需要人去听。

做法: faster-whisper small（CPU int8）逐词听写 → 剧本和听写都转成无声调拼音（pypinyin；数字逐位读、英文逐字母）→
      全局序列对齐（Needleman-Wunsch，同音/近音字算匹配：z/zh、c/ch、s/sh、l/n、in/ing、en/eng、an/ang），
      所以「银幕/萤幕」「在/再」这类同音识别错误不会被误报。
"""
import sys, os, re, json, argparse, glob
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd
from pypinyin import lazy_pinyin

SR = 16000
DIG = dict(zip('0123456789', '零一二三四五六七八九'))
INI = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']
FZ_I = {'zh': 'z', 'ch': 'c', 'sh': 's', 'l': 'n'}
FZ_F = {'ing': 'in', 'eng': 'en', 'ang': 'an', 'uang': 'uan', 'iang': 'ian'}


def tokens(text):
    """文本 → [(拼音, 原字)]。汉字一字一个；数字逐位转汉字再转拼音；英文逐字母（识别常把 AI 听成 AR，逐字母容错更好）；标点丢掉。"""
    out = []
    for m in re.finditer(r'[一-鿿㐀-䶿]|[A-Za-z]|\d', text):
        ch = m.group(0)
        if ch.isdigit(): out.append((lazy_pinyin(DIG[ch])[0], ch))
        elif re.match(r'[A-Za-z]', ch): out.append((ch.lower(), ch))
        else: out.append((lazy_pinyin(ch)[0], ch))
    return out


def norm(p):
    for i in INI:
        if p.startswith(i): return FZ_I.get(i, i), FZ_F.get(p[len(i):], p[len(i):])
    return '', FZ_F.get(p, p)


def score(a, b):
    """两个拼音的相似分：同音 2，近音 1.6，声母或韵母相同 0.3，否则 -1。"""
    if a == b: return 2.0
    if len(a) == 1 or len(b) == 1: return -1.0            # 英文字母只认完全相同
    na, nb = norm(a), norm(b)
    if na == nb: return 1.6
    if (na[0] and na[0] == nb[0]) or na[1] == nb[1]: return 0.3
    return -1.0


def load16k(path):
    x, sr = sf.read(path, dtype='float32', always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        g = gcd(sr, SR); x = resample_poly(x, SR // g, sr // g).astype(np.float32)
    return x


def env_db(x, hop=160):
    """10ms 一帧的 RMS 包络（dB，相对于这段音频的 95 分位响度）。"""
    n = len(x) // hop
    if n == 0: return np.array([-99.0])
    e = np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(e / (np.percentile(e, 95) + 1e-9))


def transcribe(files, terms, cache):
    if cache and os.path.exists(cache):
        d = json.load(open(cache))
        if d.get('files') == files: print(f'读取听写缓存 {cache}'); return d['words']
    from faster_whisper import WhisperModel
    m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
    prompt = ('以下是普通话口播。术语：' + terms + '。') if terms else None
    words = []   # [文件序号, 词, 开始, 结束]
    for fi, f in enumerate(files):
        x = load16k(f)
        segs, _ = m.transcribe(x, language='zh', word_timestamps=True, initial_prompt=prompt, vad_filter=False,
                               condition_on_previous_text=False)
        for s in segs:
            for w in (s.words or []): words.append([fi, w.word, round(w.start, 3), round(w.end, 3)])
        print(f'  听写 {os.path.basename(f)}：' + ''.join(w[1] for w in words if w[0] == fi)[:80], flush=True)
    if cache: json.dump({'files': files, 'words': words}, open(cache, 'w'), ensure_ascii=False)
    return words


def align(S, A):
    """全局对齐。S = 剧本拼音列表，A = 听写拼音列表。返回 [(i 或 None, j 或 None, 分数)]。
    行内的「水平移动」（听写多出来的字）用累积最大值向量化：row[j] = max_k(cand[k] - g*(j-k))。"""
    GD, GI = 1.0, 1.0            # 剧本字没声音 / 听写多出字 的罚分
    us, ua = sorted(set(S)), sorted(set(A))
    si = {p: k for k, p in enumerate(us)}; ai = {p: k for k, p in enumerate(ua)}
    SM = np.array([[score(a, b) for b in ua] for a in us], np.float32) if us and ua else np.zeros((1, 1), np.float32)
    Sid = np.array([si[p] for p in S]); Aid = np.array([ai[p] for p in A], dtype=int)
    n, m = len(S), len(A)
    M = np.empty((n + 1, m + 1), np.float32)
    jj = np.arange(m + 1, dtype=np.float32)
    M[0] = -GI * jj
    for i in range(1, n + 1):
        sub = SM[Sid[i - 1], Aid] if m else np.zeros(0, np.float32)
        cand = np.empty(m + 1, np.float32)
        cand[0] = M[i - 1, 0] - GD
        cand[1:] = np.maximum(M[i - 1, :-1] + sub, M[i - 1, 1:] - GD)
        M[i] = np.maximum.accumulate(cand + GI * jj) - GI * jj
    path, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            s = SM[Sid[i - 1], Aid[j - 1]]
            if abs(M[i, j] - (M[i - 1, j - 1] + s)) < 1e-3: path.append((i - 1, j - 1, float(s))); i -= 1; j -= 1; continue
        if i > 0 and abs(M[i, j] - (M[i - 1, j] - GD)) < 1e-3: path.append((i - 1, None, 0.0)); i -= 1; continue
        path.append((None, j - 1, 0.0)); j -= 1
    return path[::-1]


def main():
    ap = argparse.ArgumentParser(description='voice_check: 口播 vs 剧本')
    ap.add_argument('script'); ap.add_argument('audio')
    ap.add_argument('--terms', default=''); ap.add_argument('--json'); ap.add_argument('--cache'); ap.add_argument('--verbose', action='store_true')
    a = ap.parse_args()

    # ---- 剧本 ----
    lines = []
    for raw in open(a.script, encoding='utf-8'):
        raw = raw.strip()
        if not raw: continue
        mm = re.match(r'^(\S+?)\s*[\t|]\s*(.+)$', raw)
        lid, text = (mm.group(1), mm.group(2)) if mm else (str(len(lines) + 1), raw)
        lines.append(dict(id=lid, text=text, tok=tokens(text)))
    def build(skip):
        S, Sl, Sk = [], [], []      # 拼音、所属句子、句内位置
        for li, ln in enumerate(lines):
            if li in skip: continue
            for k, (p, ch) in enumerate(ln['tok']): S.append(p); Sl.append(li); Sk.append(k)
        return S, Sl, Sk
    S, Sl, Sk = build(set())

    # ---- 音频 + 听写 ----
    files = sorted(glob.glob(os.path.join(a.audio, '*.wav'))) if os.path.isdir(a.audio) else [a.audio]
    folder = os.path.isdir(a.audio)
    print(f'voice_check: 剧本 {len(lines)} 句 {len(S)} 字；音频 {len(files)} 个文件')
    words = transcribe(files, a.terms, a.cache)
    A = []                           # (拼音, 字, 文件, 开始, 结束)
    for fi, w, t0, t1 in words:
        tk = tokens(w)
        for k, (p, ch) in enumerate(tk):
            A.append((p, ch, fi, t0 + (t1 - t0) * k / len(tk), t0 + (t1 - t0) * (k + 1) / len(tk)))
    def stats(S, Sl, Sk):
        path = align(S, [x[0] for x in A])
        # ---- 逐句统计 ----
        st = [dict(ok=0, sub=0, dele=[], spans=[], heard=[]) for _ in lines]
        s2a = {}
        for i, j, s in path:
            if i is None: continue
            L = st[Sl[i]]
            if j is None: L['dele'].append(Sk[i])
            else:
                s2a[i] = j
                (L.__setitem__('ok', L['ok'] + 1) if s >= 1.6 else L.__setitem__('sub', L['sub'] + 1))
                L['spans'].append(j); L['heard'].append(A[j][1])
        return path, st
    path, st = stats(S, Sl, Sk)
    # 第二遍：整句漏掉的句子会从相邻句「偷」走几个同音字（比如两句都有「的画」），让邻句被误报成缺字；
    # 先把对上不到 40% 的句子剔除，再对齐一次。
    missing = {li for li, (ln, L) in enumerate(zip(lines, st)) if ln['tok'] and (L['ok'] + L['sub']) / len(ln['tok']) < 0.4}
    if missing:
        S, Sl, Sk = build(missing); path, st2 = stats(S, Sl, Sk)
        for li in missing: st2[li] = dict(st[li], spans=[], heard=[])   # 第一遍「偷」来的字不算它的
        st = st2

    report = []
    def where(j0, j1=None):
        j1 = j0 if j1 is None else j1
        return f'{os.path.basename(files[A[j0][2]])} {A[j0][3]:.2f}–{A[j1][4]:.2f}s'
    for li, (ln, L) in enumerate(zip(lines, st)):
        n = len(ln['tok']); tag = f'第{li + 1}句[{ln["id"]}]'
        if n == 0: continue
        if (L['ok'] + L['sub']) / n < 0.4 or L['ok'] / n < 0.3:
            if (L['ok'] + L['sub']) / n < 0.4 or L['ok'] / n < 0.15:
                heard = f'；那个位置听写到的是「{"".join(L["heard"])}」（{where(L["spans"][0], L["spans"][-1])}）' if L['heard'] else ''
                report.append(dict(kind='漏句', line=li, msg=f'{tag}「{ln["text"]}」在音频里找不到（同音对上 {L["ok"]}/{n} 字）{heard}'))
            else:
                report.append(dict(kind='听写不符', line=li, msg=f'{tag}「{ln["text"]}」听写成「{"".join(L["heard"])}」，{where(L["spans"][0], L["spans"][-1])}，需要人去听'))
            continue
        d = set(L['dele'])
        def run_from(ks):
            c = 0
            for k in ks:
                if k in d: c += 1
                else: break
            return c
        h, t = run_from(range(n)), run_from(range(n - 1, -1, -1))
        if 0 < h <= 3:
            j = L['spans'][0]
            report.append(dict(kind='开头被切', line=li, msg=f'{tag} 开头缺「{"".join(c for _, c in ln["tok"][:h])}」（听写从「{"".join(L["heard"][:4])}」开始，{where(j)}）'))
        if 0 < t <= 3:
            j = L['spans'][-1]
            report.append(dict(kind='结尾被切', line=li, msg=f'{tag} 结尾缺「{"".join(c for _, c in ln["tok"][n - t:])}」（听写到「{"".join(L["heard"][-4:])}」为止，{where(j)}）'))
        # 句中连续缺字
        k = h
        while k < n - t:
            if k in d:
                e = k
                while e < n - t and e in d: e += 1
                if e - k >= 2: report.append(dict(kind='句中缺字', line=li, msg=f'{tag} 中间缺「{"".join(c for _, c in ln["tok"][k:e])}」（上下文：…{ln["text"][max(0, k - 4):e + 4]}…）'))
                k = e
            else: k += 1

    # ---- 听写里多出来的字 ----
    # 把对齐路径里连续的「只有听写、没有剧本」的位置收集成一串
    seq = path; p = 0; minor = []
    while p < len(seq):
        if seq[p][0] is None:
            q = p
            while q < len(seq) and seq[q][0] is None: q += 1
            js = [seq[r][1] for r in range(p, q)]
            ins = [A[j][0] for j in js]; txt = ''.join(A[j][1] for j in js)
            # 前后最近的剧本字
            prev_i = next((seq[r][0] for r in range(p - 1, -1, -1) if seq[r][0] is not None), None)
            next_i = next((seq[r][0] for r in range(q, len(seq)) if seq[r][0] is not None), None)
            # 是否重复：和紧挨着的听写字（前面 k 个或后面 k 个）拼音一样；或者和剧本相邻的 k 个字一样
            k = len(ins)
            before = [A[j][0] for j in range(js[0] - k, js[0])] if js[0] - k >= 0 else []
            after = [A[j][0] for j in range(js[-1] + 1, js[-1] + 1 + k)] if js[-1] + 1 + k <= len(A) else []
            sb = S[prev_i - k + 1: prev_i + 1] if prev_i is not None and prev_i - k + 1 >= 0 else []
            sa = S[next_i: next_i + k] if next_i is not None else []
            nz = lambda xs: [norm(x) for x in xs]
            rep = nz(ins) in (nz(before), nz(after), nz(sb), nz(sa))
            if prev_i is not None and next_i is not None and Sl[prev_i] == Sl[next_i]:
                loc = f'第{Sl[prev_i] + 1}句[{lines[Sl[prev_i]]["id"]}] 中间（「{"".join(c for _, c in lines[Sl[prev_i]]["tok"][max(0, Sk[prev_i] - 3):Sk[prev_i] + 1])}」之后）'
            elif prev_i is not None and next_i is not None:
                loc = f'第{Sl[prev_i] + 1}句和第{Sl[next_i] + 1}句之间'
            elif prev_i is None: loc = '第 1 句之前'
            else: loc = '最后一句之后'
            if rep:
                report.append(dict(kind='多余', line=Sl[next_i] if next_i is not None else Sl[prev_i],
                                   msg=f'重复「{txt}」：{loc}，{where(js[0], js[-1])}'))
            elif len(ins) == 1 and '中间' in loc:
                minor.append(f'「{txt}」{loc}，{where(js[0])}')      # 句中单个多出的字多半是识别加的虚字（的/了/儿），只在 --verbose 里列
            else:
                report.append(dict(kind='多余', line=Sl[next_i] if next_i is not None else Sl[prev_i],
                                   msg=f'多出「{txt}」：{loc}，{where(js[0], js[-1])}（串音 / 旧录音残留 / 口误？）'))
            p = q
        else: p += 1

    # ---- 声学检查：切点有没有留白 ----
    audio = {fi: load16k(f) for fi, f in enumerate(files)}
    E = {fi: env_db(x) for fi, x in audio.items()}
    if folder:
        for fi, f in enumerate(files):
            e = E[fi]
            head, tail = e[:3].max(), e[-6:].max()      # 开头 30ms、结尾 60ms 里最响的一帧
            li = next((Sl[i] for i, j, s in path if i is not None and j is not None and A[j][2] == fi), None)
            tag = f'（第{li + 1}句[{lines[li]["id"]}]）' if li is not None else ''
            if head > -30: report.append(dict(kind='切点贴得太紧', line=li if li is not None else -1, msg=f'{os.path.basename(f)}{tag} 开头 30ms 就有 {head:.0f}dB 的声音，没有留白 —— 可能切在字中间'))
            if tail > -30: report.append(dict(kind='切点贴得太紧', line=li if li is not None else -1, msg=f'{os.path.basename(f)}{tag} 结尾 60ms 还有 {tail:.0f}dB 的声音，没有留白 —— 可能切掉了尾音'))
    else:
        e = E[0]; floor = float(np.percentile(e, 5))
        if floor > -40:
            print(f'  注意：整条音轨的底噪/配乐较响（5% 分位 {floor:.0f}dB），跳过句间停顿检查 —— 请用混音前的干声轨跑')
        for li, L in (enumerate(st) if floor <= -40 else []):
            if li == 0 or not L['spans']: continue
            prev = st[li - 1]['spans']
            if not prev: continue
            t_prev, t0 = A[prev[-1]][4], A[L['spans'][0]][3]
            a0, a1 = int(min(t_prev, t0 - 0.05) * 100), int(t0 * 100) + 3   # 上一句最后一个字结束 → 这句第一个字开始（识别时间戳有误差，向后多看 30ms）
            a0 = max(0, min(a0, a1 - 15))
            if a1 <= len(e) and e[a0:a1].min() > -32:
                report.append(dict(kind='切点贴得太紧', line=li, msg=f'第{li}句和第{li + 1}句[{lines[li]["id"]}]之间（{t_prev:.2f}–{t0:.2f}s）没有停顿（最安静处 {e[a0:a1].min():.0f}dB）—— 两段可能是硬拼在一起的'))

    # 戛然而止：一段声音后面接着静音，但静音前最后 40ms 还很响（自然的句尾会衰减到 -16dB 以下；切掉尾音的只剩 30ms 淡出）
    for fi, x in audio.items():
        e5 = env_db(x, hop=80)                       # 5ms 一帧
        sp = e5 > -40; n5 = len(e5); i = 0
        while i < n5:
            if not sp[i]: i += 1; continue
            j = i
            while j < n5 and sp[j]: j += 1
            if j - i >= 16 and (j >= n5 or not sp[j:j + 30].any()) and not (folder and j >= n5 - 12):   # 声音 ≥80ms，后面静 ≥150ms；逐句文件的结尾上面已经查过
                last = e5[max(i, j - 8):j].max()
                if last > -12:
                    t = j * 0.005
                    li = next((Sl[ii] for ii, jj, sc in path if ii is not None and jj is not None and A[jj][2] == fi and A[jj][3] <= t + 0.3 and A[jj][4] >= t - 0.6), None)
                    tag = f'第{li + 1}句[{lines[li]["id"]}]' if li is not None else ''
                    report.append(dict(kind='结尾被切', line=li if li is not None else 10 ** 6, msg=f'{os.path.basename(files[fi])} {t:.2f}s {tag} 声音戛然而止（静音前 40ms 仍有 {last:.0f}dB，正常句尾会衰减到 -16dB 以下）—— 尾音可能被切掉'))
            i = j

    # ---- 输出 ----
    order = ['漏句', '多余', '开头被切', '结尾被切', '切点贴得太紧', '句中缺字', '听写不符']
    report.sort(key=lambda r: (r['line'] if r['line'] is not None else -1, order.index(r['kind'])))
    nok = sum(L['ok'] for L in st)
    print(f'对齐：剧本 {sum(len(ln["tok"]) for ln in lines)} 字中 {nok} 字同音匹配，{sum(L["sub"] for L in st)} 字识别成别的字，{sum(len(L["dele"]) for L in st)} 字没有声音；听写多出 {sum(1 for i, j, s in path if i is None)} 字')
    if minor: print(f'  （另有 {len(minor)} 处句中单个多出的字，多半是识别加的虚字，--verbose 列出）')
    if not report: print('  没有发现问题。')
    for r in report: print(f'  [{r["kind"]}] {r["msg"]}')
    if a.verbose:
        if minor: print('\n句中单个多出的字：\n  ' + '\n  '.join(minor))
        print('\n逐句：')
        for li, (ln, L) in enumerate(zip(lines, st)):
            w = where(L['spans'][0], L['spans'][-1]) if L['spans'] else '（无）'
            print(f'  {li + 1:3d} [{ln["id"]}] {w:28s} 剧本：{ln["text"]}\n{"":38s}听写：{"".join(L["heard"])}')
    if a.json: json.dump(report, open(a.json, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
