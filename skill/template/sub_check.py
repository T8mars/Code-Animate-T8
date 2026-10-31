#!/usr/bin/env python3
"""sub_check.py —— 字幕质检：超长行、词中间断开、字幕和口播时间错位、英文缺行。

用法:
  python3 sub_check.py subs.ass --lines timeline.json                     双语 ASS（中文\\N英文）
  python3 sub_check.py subs_zh_en.srt --lines timeline.json               双语 SRT（第一行中文、第二行英文）
  python3 sub_check.py subs_zh.srt --en subs_en.srt --lines timeline.json 中英两个 SRT 分开
  python3 sub_check.py subs.ass --script script.txt                      有剧本时，「词中间断开」按剧本判断（更准）
选项: --max 20（中文每条字数上限） --en-max 80（英文字符上限，36px 字号下约等于 1680px 宽） --terms a,b（专有名词，不许拆）
      --zh-only（只有中文字幕，不查英文缺行） --json report.json

输出（每条一行）:
  [超长]        中文 > --max 字，或英文 > --en-max 字符（会换成两行甚至出画）
  [词中间断开]   一句话被切成两条时，切点落在一个词中间（「电影 | 学会」可以，「电|影」不行），或拆开了《》、「」、专有名词
  [时间错位]     字幕没有对应的口播 / 比口播早出现 >0.3 秒 / 一句口播开始 0.6 秒后还没有字幕 / 口播结束 1.5 秒后还挂着 /
                口播中间有 >0.6 秒没有字幕 / 相邻字幕重叠 / 显示不到 0.7 秒 / 每秒超过 9 个字（读不完）
  [英文缺行]     双语字幕缺英文、英文里有中文（没翻）、中英两个 SRT 条数或时间对不上
做法: 词边界用 jieba（带 --terms）。没有剧本时，相邻两条（属于同一句口播、间隔 <0.3 秒）拼起来重新分词，
      切点不在词边界上、且「强行断开」让分词概率下降超过 --cut-thr（默认 4.5，自然对数）才报；英文词、数字中间断开一律报。
      实测：电|影 9.3、慕尼|黑 18.8、儿|子 7.6；停下来|说 2.2、意外里|长出来 0.2、镜子转|盘（原文有逗号）4.0。
"""
import sys, re, json, argparse


def t_ass(s):
    h, m, x = s.split(':'); return int(h) * 3600 + int(m) * 60 + float(x)


def t_srt(s):
    h, m, x = s.replace(',', '.').split(':'); return int(h) * 3600 + int(m) * 60 + float(x)


def clean(s): return re.sub(r'\{[^}]*\}', '', s).strip()


def read_subs(path):
    """→ [[开始, 结束, 中文, 英文或 None], ...]"""
    txt = open(path, encoding='utf-8-sig').read(); out = []
    if path.endswith('.ass'):
        for l in txt.splitlines():
            if not l.startswith('Dialogue:'): continue
            p = l.split(',', 9); parts = [clean(x) for x in p[9].split('\\N')]
            out.append([t_ass(p[1]), t_ass(p[2]), parts[0], parts[1] if len(parts) > 1 else None])
    else:
        for blk in re.split(r'\n\s*\n', txt.strip()):
            ls = [l for l in blk.strip().splitlines() if l.strip()]
            if len(ls) < 2 or '-->' not in ls[1]: continue
            a, b = [x.strip() for x in ls[1].split('-->')]
            body = [clean(x) for x in ls[2:]]
            out.append([t_srt(a), t_srt(b), body[0] if body else '', body[1] if len(body) > 1 else None])
    return out


CJK = re.compile(r'[一-鿿]')
PUNCT = '，。：；？！、…'


def main():
    ap = argparse.ArgumentParser(description='sub_check 字幕质检')
    ap.add_argument('subs'); ap.add_argument('--en'); ap.add_argument('--lines'); ap.add_argument('--script')
    ap.add_argument('--max', type=int, default=20); ap.add_argument('--en-max', type=int, default=80)
    ap.add_argument('--terms', default=''); ap.add_argument('--zh-only', action='store_true'); ap.add_argument('--json')
    ap.add_argument('--cut-thr', type=float, default=4.5, help='词中间断开的判定阈值（jieba 分词对数概率的损失）')
    a = ap.parse_args()
    import jieba, logging
    jieba.setLogLevel(logging.WARNING)
    terms = [t.strip() for t in a.terms.split(',') if t.strip()]
    for w in terms: jieba.add_word(w, 10000)
    jieba.initialize()
    def best_logp(x):   # jieba 最优分词路径的对数概率
        DAG = jieba.dt.get_DAG(x); route = {}; jieba.dt.calc(x, DAG, route); return route[0][0]

    S = read_subs(a.subs)
    rep = []
    def R(kind, i, msg): rep.append(dict(kind=kind, i=i, t=round(S[i][0], 2) if i is not None and i < len(S) else None, msg=msg))
    fmt = lambda x: f'{int(x // 60)}:{x % 60:05.2f}'
    tag = lambda i: f'#{i + 1} {fmt(S[i][0])}「{S[i][2]}」'

    # ---- 英文 ----
    if a.en:
        E = read_subs(a.en)
        if len(E) != len(S): R('英文缺行', None, f'中文 {len(S)} 条，英文 {len(E)} 条，条数不一致')
        for i, (s, e) in enumerate(zip(S, E)):
            if abs(s[0] - e[0]) > 0.05 or abs(s[1] - e[1]) > 0.05: R('英文缺行', i, f'{tag(i)} 中英时间对不上（英文 {fmt(e[0])}–{fmt(e[1])}）')
            s[3] = e[2]
    if not a.zh_only:
        for i, s in enumerate(S):
            if not s[3]: R('英文缺行', i, f'{tag(i)} 没有英文')
            elif CJK.search(s[3]) or s[3].strip() == s[2].strip() or '缺译文' in s[3]: R('英文缺行', i, f'{tag(i)} 英文行没翻译：「{s[3]}」')

    # ---- 超长 ----
    for i, s in enumerate(S):
        if len(s[2]) > a.max: R('超长', i, f'{tag(i)} 中文 {len(s[2])} 字（上限 {a.max}）')
        if s[3] and len(s[3]) > a.en_max: R('超长', i, f'{tag(i)} 英文 {len(s[3])} 字符（上限 {a.en_max}）：{s[3][:60]}…')

    # ---- 口播时间 ----
    lines = {}
    if a.lines:
        tl = json.load(open(a.lines, encoding='utf-8')); lines = {k: v for k, v in tl['lines'].items()}
    LV = sorted(lines.values())
    owner = []   # 每条字幕属于哪句口播（重叠最多的那句）
    for i, s in enumerate(S):
        best, ov = None, 0
        for k, (la, lb) in lines.items():
            o = min(s[1], lb) - max(s[0], la)
            if o > ov: best, ov = k, o
        owner.append(best)
    if lines:
        for i, s in enumerate(S):
            if owner[i] is None: R('时间错位', i, f'{tag(i)} 这段时间没有口播'); continue
            la, lb = lines[owner[i]]
            if s[0] < la - 0.3: R('时间错位', i, f'{tag(i)} 比口播早 {la - s[0]:.2f}s 出现')
            if s[1] > lb + 1.5 and (i + 1 >= len(S) or owner[i + 1] != owner[i]): R('时间错位', i, f'{tag(i)} 口播结束后还挂了 {s[1] - lb:.2f}s')
        for k, (la, lb) in sorted(lines.items(), key=lambda kv: kv[1][0]):
            mine = sorted([s for s, o in zip(S, owner) if o == k])
            if not mine: rep.append(dict(kind='时间错位', i=None, t=la, msg=f'{fmt(la)}–{fmt(lb)} 第 {k} 句口播没有字幕')); continue
            if mine[0][0] > la + 0.6: rep.append(dict(kind='时间错位', i=None, t=la, msg=f'第 {k} 句口播 {fmt(la)} 开始，字幕 {mine[0][0] - la:.2f}s 后才出现'))
            cur = max(la, mine[0][0])
            for s in mine:
                if s[0] - cur > 0.6: rep.append(dict(kind='时间错位', i=None, t=cur, msg=f'第 {k} 句口播中间 {fmt(cur)}–{fmt(s[0])} 有 {s[0] - cur:.2f}s 没有字幕'))
                cur = max(cur, s[1])
            if lb - cur > 0.6: rep.append(dict(kind='时间错位', i=None, t=cur, msg=f'第 {k} 句口播最后 {lb - cur:.2f}s（{fmt(cur)}–{fmt(lb)}）没有字幕'))
    for i in range(len(S)):
        s = S[i]
        if i + 1 < len(S) and s[1] > S[i + 1][0] + 0.01: R('时间错位', i, f'{tag(i)} 和下一条重叠 {s[1] - S[i + 1][0]:.2f}s')
        d = s[1] - s[0]
        if d < 0.7: R('时间错位', i, f'{tag(i)} 只显示 {d:.2f}s')
        else:
            u = len(re.findall(r'[\u4e00-\u9fff]|[A-Za-z]+|\d+', s[2]))     # 阅读单位：一个汉字或一个英文词/数字
            if u / d > 9: R('时间错位', i, f'{tag(i)} {u} 字只显示 {d:.2f}s（每秒 {u / d:.1f} 字，读不完）')

    # ---- 词中间断开 ----
    script_txt = ''
    if a.script:
        for raw in open(a.script, encoding='utf-8'):
            raw = raw.strip(); m = re.match(r'^(\S+?)\s*[\t|]\s*(.+)$', raw); script_txt += (m.group(2) if m else raw)
    def norm(x): return re.sub(r'[\s「」“”"]', '', x)
    for i, s in enumerate(S):
        z = s[2]
        for o, c in (('《', '》'), ('「', '」'), ('“', '”')):
            if z.count(o) != z.count(c): R('词中间断开', i, f'{tag(i)} {o}{c} 不成对（被拆到两条里了）'); break
        for t in terms:
            for k in range(1, len(t)):
                if z.endswith(t[:k]) and i + 1 < len(S) and S[i + 1][2].startswith(t[k:]): R('词中间断开', i, f'{tag(i)} 专有名词「{t}」被拆开')
    for i in range(len(S) - 1):
        A, B = S[i][2], S[i + 1][2]
        if not A or not B: continue
        if lines and owner[i] != owner[i + 1]: continue                   # 不同句子之间本来就该断
        if not lines and S[i + 1][0] - S[i][1] > 0.3: continue
        if A[-1] in PUNCT or B[0] in PUNCT: continue
        if re.match(r'[A-Za-z0-9]', A[-1]) and re.match(r'[A-Za-z0-9]', B[0]) and A[-1].isalpha() == B[0].isalpha():
            m1, m2 = re.search(r'[A-Za-z0-9]+$', A).group(0), re.match(r'[A-Za-z0-9]+', B).group(0)
            R('词中间断开', i, f'#{i + 1}–#{i + 2} {fmt(S[i][0])}「{A}」|「{B}」：英文词/数字「{m1}{m2}」被拆开'); continue
        if script_txt:                                                    # 剧本里这个切点后面紧跟标点 → 正常
            j = norm(script_txt).find(norm(A) + norm(B))
            if j < 0:
                j2 = norm(script_txt).find(norm(A))
                if j2 >= 0 and j2 + len(norm(A)) < len(norm(script_txt)) and norm(script_txt)[j2 + len(norm(A))] in PUNCT: continue
        joined = A + B; cut = len(A); acc = 0; spanning = None
        for w in jieba.cut(joined):
            if acc < cut < acc + len(w): spanning = w; break
            acc += len(w)
        if not spanning: continue
        left, right = spanning[:cut - acc], spanning[cut - acc:]
        if not (CJK.search(left) and CJK.search(right)): continue          # 英文/数字和中文相连处 jieba 不可靠
        cost = best_logp(joined) - best_logp(A) - best_logp(B)           # 强行在这里断开，分词概率掉了多少（自然对数）
        if cost < a.cut_thr: continue                                     # 「停下来|说」「意外里|长出来」这类本来就能断的，代价很小
        R('词中间断开', i, f'#{i + 1}–#{i + 2} {fmt(S[i][0])}「{A}」|「{B}」：词「{spanning}」被拆成「{left}」+「{right}」（断开代价 {cost:.1f}）')

    # ---- 输出 ----
    order = ['超长', '词中间断开', '时间错位', '英文缺行']
    rep.sort(key=lambda r: (order.index(r['kind']), r['t'] if r['t'] is not None else -1))
    print(f'sub_check: {a.subs}  {len(S)} 条' + (f'，口播 {len(lines)} 句' if lines else '（没给 --lines，不查口播时间）'))
    cnt = {k: sum(1 for r in rep if r['kind'] == k) for k in order}
    print('  ' + '，'.join(f'{k} {v}' for k, v in cnt.items()))
    if not rep: print('  没有发现问题。')
    for r in rep: print(f'  [{r["kind"]}] {r["msg"]}')
    if a.json: json.dump(rep, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if rep else 0)


if __name__ == '__main__':
    main()
