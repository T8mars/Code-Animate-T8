#!/usr/bin/env python3
"""subs.py —— 剧本 + 逐句时间表 → 中文分条 → 双语 ASS（中上英下）+ 三份 SRT。

用法:
  python3 subs.py script.txt timeline.json en.json --out subs/片名
  python3 subs.py script.txt timeline.json en_subs.py --out subs/片名 --terms "莱恩·莱,Monster Movie,文字之城"
选项:
  --max 20        每条中文最多几个字（默认 20；标点处优先断，超过 17 字就开新条）
  --terms a,b,c   不能拆开的专有名词（同时加进 jieba 词典）。《》里的内容永远不拆。
  --words w.json  可选：逐句的词级时间（{句子id: [[词, 句内开始秒, 句内结束秒], ...]}，可由口播对齐脚本导出），
                  有了它每条字幕的出现时刻对准这条第一个字实际开口的时刻；没有就按字数比例估算。
  --fix "难辩=难辨,cluade=Claude"   出字幕前对剧本做的错别字替换
  --allow-missing  缺英文时用「[缺译文]」占位继续出文件（默认报错退出）
输入:
  script.txt   一行一句，可写 "L021|句子" 带编号（和 voice_check.py 相同）；不带编号时按行号 1,2,3…
  timeline.json  {"lines": {"21": [开始秒, 结束秒], ...}}（口播对齐/时间线脚本的输出；id 按数字匹配，L021 = 21）
  en           「中文字幕条原文 → 英文」字典：.json 文件，或 Python 文件里的 EN = {...}（只做字面量解析，不执行代码）
               键是去掉末尾标点后的中文条（和本工具切出来的一样）。缺的条目会全部列出，并写一个 <out>_missing_en.json 模板，填好合并即可。
输出:
  <out>.ass        双语，中文 58px 在上、英文 36px 在下，半透明底框（BorderStyle 3），淡入淡出
  <out>_zh.srt / <out>_en.srt / <out>_zh_en.srt
  <out>.json       [[开始, 结束, 中文, 英文, 句子id], ...]，给 sub_check.py 用
分条规则（照搬《写出来的影像》的 timeline.py）：
  先在标点（，。：；？！、…）处断；拼到 ≤17 字为一条；单条仍 >20 字时用 jieba 分词，只在词边界断，不拆《》和 --terms，
  优先断在「的/了/，」后面、靠近中间的位置；相邻两条间隔 <1 秒且合起来 ≤20 字就合并；每条至少显示 0.9 秒，末尾多留 0.25 秒。
"""
import sys, os, re, json, ast, argparse

PUNCT = '，。：；？！、…'


def load_script(path, fixes):
    out = []
    for raw in open(path, encoding='utf-8'):
        raw = raw.strip()
        if not raw: continue
        m = re.match(r'^(\S+?)\s*[\t|]\s*(.+)$', raw)
        lid, text = (m.group(1), m.group(2)) if m else (str(len(out) + 1), raw)
        for a, b in fixes: text = text.replace(a, b)
        out.append((lid, text))
    return out


def num_id(x): return str(int(re.sub(r'\D', '', str(x)) or 0))


def load_en(path):
    if path.endswith('.json'): return json.load(open(path, encoding='utf-8'))
    tree = ast.parse(open(path, encoding='utf-8').read())          # 只取 EN = {...} 字面量，不执行文件
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'EN' for t in node.targets):
            return ast.literal_eval(node.value)
    raise SystemExit(f'{path} 里没有找到 EN = {{...}}')


def chunks(text, jieba, MAX=20, SOFT=17, L=len):
    """L：显示长度函数（专有名词占位符按原词长度算）。切分位置用字符下标，长度判断一律用 L。"""
    text = re.sub(r'\s+', ' ', text).strip()
    parts = re.split(f'(?<=[{PUNCT}])', text)
    mg = []
    for p in parts:                                                   # 《》 里的标点不断
        if mg and mg[-1].count('《') > mg[-1].count('》'): mg[-1] += p
        else: mg.append(p)
    out, cur = [], ''
    for p in mg:
        if not p: continue
        if L(cur) + L(p) <= SOFT or not cur: cur += p
        else: out.append(cur); cur = p
        while L(cur) > MAX:                                           # 长句按词切
            words = list(jieba.cut(cur)); pos = []; acc = 0; depth = 0
            for w in words:
                depth += w.count('《') - w.count('》'); acc += len(w); la = L(cur[:acc])
                if depth <= 0 and 5 <= la <= L(cur) - 4: pos.append((acc, w, la))
            mid = L(cur) / 2
            best = min(pos, key=lambda x: abs(x[2] - mid) - (3 if x[1][-1] in '的了，' else 0))[0] if pos else len(cur) // 2
            out.append(cur[:best]); cur = cur[best:]
    if cur: out.append(cur)
    return out


def spoken_units(s): return max(1, len(re.findall(r'[一-鿿]|[A-Za-z]+|\d', s)))


def strip_tail(s): return re.sub(r'[，。：；、]+$', '', s).strip()      # 问号、叹号、省略号保留（语气）


def ts_ass(x): return f'{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}'


def ts_srt(x):
    ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


ASS_HEAD = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 2', '',
            '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
            'Style: Main,Noto Sans CJK SC Medium,58,&H00F0F4F6,&H00F0F4F6,&H78000000,&H00000000,0,0,0,0,100,100,2,0,3,9,0,2,120,120,48,1', '',
            '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']


def main():
    ap = argparse.ArgumentParser(description='subs.py 双语字幕')
    ap.add_argument('script'); ap.add_argument('timing'); ap.add_argument('en')
    ap.add_argument('--out', required=True); ap.add_argument('--max', type=int, default=20)
    ap.add_argument('--terms', default=''); ap.add_argument('--words'); ap.add_argument('--fix', default='')
    ap.add_argument('--allow-missing', action='store_true')
    a = ap.parse_args()
    import jieba, logging
    jieba.setLogLevel(logging.WARNING)
    terms = [t.strip() for t in a.terms.split(',') if t.strip()]
    for w in terms: jieba.add_word(w, 10000)
    fixes = [tuple(x.split('=', 1)) for x in a.fix.split(',') if '=' in x]
    script = load_script(a.script, fixes)
    tl = json.load(open(a.timing, encoding='utf-8')); lines = {num_id(k): v for k, v in tl['lines'].items()}
    words = {num_id(k): v for k, v in json.load(open(a.words)).items()} if a.words else {}
    EN = load_en(a.en)

    SUBS, nolines = [], []
    for lid, text in script:
        if num_id(lid) not in lines: nolines.append(lid); continue
        st0, en0 = lines[num_id(lid)]; d = en0 - st0
        # 专有名词含空格/标点时（如 Monster Movie），先用占位符保护，切完再换回
        prot = {}
        for k, t in enumerate(sorted(terms, key=len, reverse=True)):
            if t in text and re.search(r'[^\w]', t): ph = chr(0xE000 + k); prot[ph] = t; text = text.replace(t, ph)   # 只保护含空格/符号的词，其余交给 jieba 词典
        restore = lambda s: ''.join(prot.get(c, c) for c in s)
        ch = chunks(text, jieba, a.max, a.max - 3, L=lambda s: len(restore(s)))
        n = sum(len(restore(c)) for c in ch)                      # 按显示字符比例定位（和 timeline.py 一致，已验证逐条相同）
        wt = []                                                       # 每个「发音单位」的开口时刻
        for w, ws, we in words.get(num_id(lid), []):
            k = spoken_units(w)
            for j in range(k): wt.append(ws + (we - ws) * j / k)
        acc, pos = [], 0
        for c in ch:
            frac = pos / n
            t_rel = (wt[min(len(wt) - 1, int(frac * len(wt)))] if wt else frac * d) if pos > 0 else 0
            acc.append([restore(c), st0 + max(0, min(t_rel, d - .3))]); pos += len(restore(c))
        k = 0
        while k < len(acc) - 1:                                       # 显示不到 1 秒的条和下一条合并
            if acc[k + 1][1] - acc[k][1] < 1.0 and len(acc[k][0]) + len(acc[k + 1][0]) <= a.max: acc[k][0] += acc[k + 1][0]; del acc[k + 1]
            else: k += 1
        if len(acc) > 1 and en0 + .25 - acc[-1][1] < 1.0 and len(acc[-2][0]) + len(acc[-1][0]) <= a.max: acc[-2][0] += acc[-1][0]; del acc[-1]
        for i, (c, st) in enumerate(acc):
            en = acc[i + 1][1] if i + 1 < len(acc) else en0 + 0.25
            SUBS.append([round(st, 3), round(en, 3), strip_tail(c), num_id(lid)])
    SUBS.sort(key=lambda s: s[0])
    for i, s in enumerate(SUBS):                                      # 至少显示 0.9 秒，往后面的静音里延长
        nxt = SUBS[i + 1][0] if i + 1 < len(SUBS) else s[1] + 2
        if s[1] - s[0] < 0.9: s[1] = min(nxt - 0.02, s[0] + 0.9)
        s[1] = min(s[1] + 0.25, nxt - 0.02) if nxt - s[1] < 1.2 else s[1] + 0.25
        s[1] = round(s[1], 3)
    if nolines: print(f'警告：{len(nolines)} 句在时间表里找不到，没出字幕：{", ".join(nolines[:20])}')

    missing = [s[2] for s in SUBS if not EN.get(s[2])]
    if missing:
        print(f'缺英文 {len(missing)} 条（键必须和下面的中文条完全一致）：')
        for m in missing: print(f'  {m}')
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump({m: '' for m in missing}, open(a.out + '_missing_en.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'已写模板 {a.out}_missing_en.json，填好后合并进英文字典再运行')
        if not a.allow_missing: sys.exit(1)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    rows = [[st, en, zh, EN.get(zh) or '[缺译文]', lid] for st, en, zh, lid in SUBS]
    ass = list(ASS_HEAD)
    for st, en, zh, e, lid in rows:
        z = zh.replace('「', '“').replace('」', '”')
        ass.append(f'Dialogue: 0,{ts_ass(st)},{ts_ass(en)},Main,,0,0,0,,{{\\fad(90,120)}}{z}\\N{{\\fs36\\bord7\\fsp0.5}}{e}')
    open(a.out + '.ass', 'w', encoding='utf-8').write('\n'.join(ass) + '\n')
    for suf, f in (('_zh_en', lambda r: r[2] + '\n' + r[3]), ('_zh', lambda r: r[2]), ('_en', lambda r: r[3])):
        open(a.out + suf + '.srt', 'w', encoding='utf-8').write(''.join(f'{i + 1}\n{ts_srt(r[0])} --> {ts_srt(r[1])}\n{f(r)}\n\n' for i, r in enumerate(rows)))
    json.dump(rows, open(a.out + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    L = max(len(r[2]) for r in rows) if rows else 0
    print(f'字幕 {len(rows)} 条（{len(script) - len(nolines)} 句），最长 {L} 字 → {a.out}.ass / _zh.srt / _en.srt / _zh_en.srt / .json')


if __name__ == '__main__':
    main()
