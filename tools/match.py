"""Map script lines to recorded takes; keep the LAST good take of each line.
Smith-Waterman on pinyin tokens per line vs. the full ASR stream (all wavs),
then a monotonic DP over candidates that prefers later takes.
Boundaries refined with an energy VAD on the raw audio."""
import json, re, sys, numpy as np, subprocess
from pypinyin import lazy_pinyin, Style
P = __import__('os').environ.get('FILM_PROJECT', '.')  # 工程目录：放 voice/ align/ music/ 的地方
lines = json.load(open(f'{P}/align/lines.json'))
NUM = {'0':'零','1':'一','2':'二','3':'三','4':'四','5':'五','6':'六','7':'七','8':'八','9':'九'}

def num2zh(s):
    # years / numbers read digit by digit or as quantity; normalise both sides by spelling digits
    return ''.join(NUM.get(c, c) for c in s)

def toks(text):
    text = num2zh(text)
    out = []
    for m in re.finditer(r'[一-鿿]|[A-Za-z]+', text):
        w = m.group(0)
        if re.match(r'[A-Za-z]', w):
            out += list(w.lower())  # letters individually (ASR often mangles: AI->AR)
        else:
            out.append(lazy_pinyin(w)[0])
    return out

# --- ASR stream ---
S = []  # (tok, file, t0, t1)
for f in range(6):
    W = json.load(open(f'{P}/align/asr_{f}.json'))
    for w, a, b in W:
        units = [m.group(0) for m in re.finditer(r'[一-鿿]|[A-Za-z]+|\d+', w)]
        expanded = []
        for u in units:
            expanded += [(t) for t in toks(u)]
        n = max(1, len(expanded))
        for k, t in enumerate(expanded):
            S.append((t, f, a + (b - a) * k / n, a + (b - a) * (k + 1) / n))
ST = [s[0] for s in S]
N = len(ST)
print('stream tokens', N)

INI = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']
def split(p):
    for i in INI:
        if p.startswith(i): return i, p[len(i):]
    return '', p
FZ = {'zh':'z','ch':'c','sh':'s','l':'n','ing':'in','eng':'en','ang':'an','uang':'uan'}
def norm(p):
    i, f = split(p)
    return FZ.get(i, i), FZ.get(f, f)
NS = [norm(t) for t in ST]

def sc(a, b, na, nb):
    if a == b: return 2.0
    if na == nb: return 1.6
    if na[1] == nb[1] or na[0] == nb[0] and len(a) > 1 and len(b) > 1: return 0.3
    return -1.0

def sw(q):
    """semi-global: whole query aligned, free start/end on stream. returns score[j], start[j]"""
    L = len(q); nq = [norm(t) for t in q]
    prev = np.zeros(N + 1, np.float32); prevB = np.arange(N + 1, dtype=np.int32)
    for i in range(1, L + 1):
        qi, nqi = q[i - 1], nq[i - 1]
        sub = np.array([sc(qi, ST[j], nqi, NS[j]) for j in range(N)], np.float32)
        diag = prev[:-1] + sub; up = prev[1:] - 1.0
        db = diag >= up
        cand = np.where(db, diag, up); cb = np.where(db, prevB[:-1], prevB[1:])
        row = np.empty(N + 1, np.float32); rb = np.empty(N + 1, np.int32)
        row[0] = -i; rb[0] = 0
        for j in range(1, N + 1):
            v = cand[j - 1]; bb = cb[j - 1]; l = row[j - 1] - 1.0
            if l > v: v, bb = l, rb[j - 1]
            row[j] = v; rb[j] = bb
        prev, prevB = row, rb
    return prev, prevB

cands = []
for ln in lines:
    q = toks(ln['text']); L = len(q)
    best, start = sw(q)
    thr = 2.0 * L * 0.55
    cs = []
    j = 1
    while j <= N:
        if best[j] >= thr:
            # local max within a window
            k = j
            while k + 1 <= N and best[k + 1] >= best[k]: k += 1
            cs.append((int(start[k]), k, float(best[k]) / (2.0 * L)))
            j = k + max(3, L // 2)
        else:
            j += 1
    if not cs:
        k = int(best.argmax()); cs = [(int(start[k]), k, float(best[k]) / (2.0 * L))]
    cands.append(cs)
    print(ln['id'], L, [(c[0], c[1], round(c[2], 2)) for c in cs], flush=True)

# --- monotonic DP: maximise score; prefer later takes (tiny bonus) ---
n = len(lines)
dp = [dict() for _ in range(n)]
for i in range(n):
    for ci, (s0, e0, q) in enumerate(cands[i]):
        val = q + 1e-5 * s0
        if i == 0:
            dp[i][ci] = (val, None); continue
        bestp = None
        for pj, (v, _) in dp[i - 1].items():
            if cands[i - 1][pj][1] <= s0 + 2 and (bestp is None or v > bestp[0]):
                bestp = (v, pj)
        if bestp is None:  # allow a skip penalty by taking best previous anyway
            pj = max(dp[i - 1], key=lambda k: dp[i - 1][k][0]); bestp = (dp[i - 1][pj][0] - 1.0, pj)
        dp[i][ci] = (bestp[0] + val, bestp[1])
ci = max(dp[-1], key=lambda k: dp[-1][k][0])
pick = [None] * n
for i in range(n - 1, -1, -1):
    pick[i] = ci; ci = dp[i][ci][1]

# --- VAD refine ---
aud = {}
for f in range(6):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{P}/voice/raw_{f}.wav', '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
    aud[f] = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
def env(f):
    x = aud[f]; hop = 160
    e = np.sqrt(np.convolve(x[:len(x) // hop * hop].reshape(-1, hop).__pow__(2).mean(1), np.ones(3) / 3, 'same'))
    return e
ENV = {f: env(f) for f in range(6)}
out = []
for i, ln in enumerate(lines):
    s0, e0, q = cands[i][pick[i]]
    f = S[s0][1]; t0 = S[s0][2]; t1 = S[min(e0 - 1, N - 1)][3]
    if S[min(e0 - 1, N - 1)][1] != f: t1 = t0 + 3
    E = ENV[f]; fl = np.percentile(E, 10); thr = max(fl * 4, 0.006)
    a = int(t0 * 100); b = int(t1 * 100)
    # walk start back to silence (max 0.6s), end forward to silence (max 0.8s)
    k = a
    while k > max(0, a - 60) and E[k] > thr: k -= 1
    a2 = k
    k = min(b, len(E) - 1)
    while k < min(len(E) - 1, b + 80) and E[k] > thr: k += 1
    b2 = k
    nt = sum(1 for c in cands[i] if c[2] > 0.55)
    out.append(dict(id=ln['id'], text=ln['text'], file=f, t0=round(a2 / 100 - 0.05, 2), t1=round(b2 / 100 + 0.12, 2), asr_t0=round(t0, 2), asr_t1=round(t1, 2), score=round(q, 2), takes=nt))
json.dump(out, open(f'{P}/align/takes.json', 'w'), ensure_ascii=False, indent=1)
for o in out:
    flag = '  <<< LOW' if o['score'] < 0.7 else ''
    print(f"L{o['id']:<3} f{o['file']} {o['t0']:7.2f}-{o['t1']:7.2f} s={o['score']} takes={o['takes']} {o['text'][:24]}{flag}")
