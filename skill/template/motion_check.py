#!/usr/bin/env python3
"""motion_check.py —— 看「运动」的自动质检：读渲染好的 mp4，逐帧算相邻帧差和整体位移，报告卡顿、静止过久、镜头抖。

用法:
  python3 motion_check.py out.mp4                     整条片子
  python3 motion_check.py out.mp4 --start 100 --end 130   只查一段（秒）
  python3 motion_check.py list.txt                    分段渲染的 ffmpeg concat 列表（每行 file 'c_0001.mp4'），不用先拼接
  python3 motion_check.py out.mp4 --csv m.csv         另存逐帧数据（帧号, 时间, 帧差, 0.5 秒差, 位移 dx dy, 可信块数, 离散度, 是否切镜头）
  python3 motion_check.py out.mp4 --json r.json       报告的机器可读版本
可调阈值（一般不用动）: --static-sec 2.0  --static-thr 1.0  --move-thr 1.0  --jitter-px 1.5

输出（人读）每条一行：  [类型] 起–止时间（帧号）  原因
  [卡顿]     画面某一区域在「运动中」，但每 N 帧才变一次（帧差周期性为零），或每 N 帧出现一次大跳变（帧差周期性尖峰）。
             标「不均匀」的（例如 4,4,4,3 帧交替）一定要修 —— 用 lib.js 的 stepAt() 让每秒步数整除 30；
             标「均匀」的（例如每 3 帧一次）若不是刻意的定格风格，也会显得一顿一顿，可以改成每帧一格或加 motionBlur()。
  [静止过久] 连续超过 --static-sec 秒几乎没有变化（只剩颗粒噪声；和 0.5 秒前那帧比，慢速推拉不会被误报）。片头片尾、刻意停顿可以忽略。
  [抖动]     相位相关估计的整体位移（竖直 dy / 水平 dx）在短时间内来回翻转符号：镜头抖。
             常见原因：相机高度/位置每帧按「当前最大值」重算，帧间跳变。修法：对相机参数做时间上的平滑（预计算 + 低通，或用解析式）。
             刻意的冲击震屏也会被报出来，核对时间点即可。
  [切镜头]   只作为参考列出（帧差突变），分析时不跨越切点。

做法（都在 320 宽灰度图上，颗粒噪声经面积下采样后基本被平均掉）:
  帧差 = 相邻两帧逐像素绝对差的平均（0–255）；另外把画面分成 4×3 个区域各算一份，局部的步进动画（如画面一角的诡盘）也能抓到。
  卡顿 = 在 1 秒滑窗内该区域有明显运动（窗口内 80 分位帧差 > 阈值），并且满足下面任一种：
         停顿型：≥30% 的帧帧差 < 参考值的 20%，「变化帧」间隔中位数 ≥ 2（整块每 N 帧才更新）；
         跳变型：帧差每 2–10 帧出现一次尖峰（> 1.8 倍中位数），且尖峰间隔有周期性（别的东西每帧在动，某样东西隔几帧跳一步）。
  抖动 = 相位相关（numpy FFT，汉宁窗，亚像素质心）在 4×3 块上各估一次位移，取可信块的中位数作为每帧 dx dy；减去 9 帧滑动中位数（去掉正常平移），
         残差超过 --jitter-px（换算成 1080p 像素）的帧里，1 秒内符号翻转 ≥ 3 次即报。
已知局限: 见 TOOLS.md。大面积独立运动（粒子、滚动文字很多）时相位相关置信度低，这些帧不参与抖动判断。
"""
import sys, json, argparse, subprocess
import numpy as np
from scipy.ndimage import median_filter, percentile_filter

AW = 320              # 分析宽度
GX, GY = 4, 3         # 区域网格


def concat_first(path):
    """ffmpeg concat 列表（file 'xxx.mp4' 每行一个）的第一个文件，用来读分辨率和帧率。"""
    import os
    for l in open(path):
        l = l.strip()
        if l.startswith('file '):
            f = l[5:].strip().strip("'\"")
            return f if os.path.isabs(f) else os.path.join(os.path.dirname(os.path.abspath(path)), f)


def probe(path):
    if path.endswith('.txt'): path = concat_first(path)
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                          '-of', 'json', path], capture_output=True, text=True).stdout
    s = json.loads(out)['streams'][0]
    a, b = s['r_frame_rate'].split('/')
    return int(s['width']), int(s['height']), float(a) / float(b)


def frames(path, start, end, w, h):
    """逐帧产出 320 宽灰度图（float32）。用 ffmpeg 的 area 缩放，相当于对颗粒做了 6×6 平均。"""
    ah = int(round(AW * h / w / 2)) * 2
    cmd = ['ffmpeg', '-v', 'error']
    if start: cmd += ['-ss', str(start)]
    cmd += (['-f', 'concat', '-safe', '0', '-i', path] if path.endswith('.txt') else ['-i', path])
    if end: cmd += ['-t', str(end - (start or 0))]
    cmd += ['-vf', f'scale={AW}:{ah}:flags=area,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = AW * ah
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n: break
        yield np.frombuffer(buf, np.uint8).reshape(ah, AW).astype(np.float32)
    p.wait()


_WIN = {}
def phase_corr(a, b):
    """返回 (dx, dy, 峰值比)：b 相对 a 的整体平移（像素，320 宽尺度）。
    峰值比 = 最高峰 / 第二高峰（排除最高峰周围 7×7）。画面里有几样东西各动各的时会出现几个差不多高的峰，
    这时「整体位移」没有意义，峰值比接近 1；整体平移时峰值比通常 > 3。"""
    h, w = a.shape
    if (h, w) not in _WIN: _WIN[(h, w)] = np.outer(np.hanning(h), np.hanning(w)).astype(np.float32)
    win = _WIN[(h, w)]
    A = np.fft.rfft2((a - a.mean()) * win); B = np.fft.rfft2((b - b.mean()) * win)
    Rr = B * np.conj(A); Rr /= np.abs(Rr) + 1e-6
    r = np.fft.irfft2(Rr, s=(h, w))
    k = int(np.argmax(r)); py, px = divmod(k, w)
    peak = r[py, px]
    r2 = np.roll(np.roll(r, 3 - py, 0), 3 - px, 1).copy(); r2[:7, :7] = -1e9
    ratio = float(peak / max(r2.max(), 1e-9))
    def sub(m, c, p):   # 峰值和左右邻居的加权质心（对相位相关的尖峰比抛物线插值偏差小）
        m, p = max(m, 0.0), max(p, 0.0)
        return (p - m) / (m + c + p) if (m + c + p) > 1e-9 else 0.0
    dx = px + sub(r[py, (px - 1) % w], peak, r[py, (px + 1) % w])
    dy = py + sub(r[(py - 1) % h, px], peak, r[(py + 1) % h, px])
    if dx > w / 2: dx -= w
    if dy > h / 2: dy -= h
    return dx, dy, ratio


def global_shift(a, b):
    """整体位移的稳健估计：画面分 4×3 块各做一次相位相关，取「可信块」（峰值比 > 2.5）位移的中位数。
    一个快速移动的物体只影响它所在的一两块，中位数仍是背景（镜头）的运动；镜头抖时所有块一起动。
    返回 (dx, dy, 可信块数, 可信块之间 dy 的离散度)。可信块 < 4 或离散度大时，这一帧不参与抖动判断。"""
    h, w = a.shape; th, tw = h // GY, w // GX
    res = []
    for gy in range(GY):
        for gx in range(GX):
            ta = a[gy * th:(gy + 1) * th, gx * tw:(gx + 1) * tw]; tb = b[gy * th:(gy + 1) * th, gx * tw:(gx + 1) * tw]
            edge = np.abs(np.diff(ta, axis=0)).mean() + np.abs(np.diff(ta, axis=1)).mean()
            if edge < 4.5: continue                        # 低纹理块（纯色/渐变天空、雾、黑底，只剩颗粒）算不出可靠位移，跳过
            dx, dy, pr = phase_corr(ta, tb)
            if pr > 2.5: res.append((dx, dy))
    if len(res) < 4: return 0.0, 0.0, len(res), 99.0
    r = np.array(res); mx, my = np.median(r[:, 0]), np.median(r[:, 1])
    spread = float(np.median(np.hypot(r[:, 0] - mx, r[:, 1] - my)))
    return float(mx), float(my), len(res), spread


def cadence_runs(seg, mode):
    """在一段帧差里重新找「事件帧」（停顿型：有变化的帧；跳变型：尖峰帧），按间隔序列把这段切成「均匀」和「不均匀」的子段。
    返回 [(起, 止, 间隔列表, 是否不均匀), ...]，起止是 seg 内的下标。"""
    n = len(seg)
    if mode == 'spike':
        base = median_filter(seg, size=31, mode='nearest'); ev = np.where((seg > 1.8 * base) & (seg - base > 0.8))[0]
    else:
        ref = percentile_filter(seg, 80, size=31, mode='nearest'); ev = np.where(seg >= 0.2 * ref)[0]
    gaps = np.diff(ev)
    if len(gaps) < 3: return [(0, n, gaps.tolist(), False)]
    vals, cnt = np.unique(gaps, return_counts=True); main_gap = vals[np.argmax(cnt)]
    odd = gaps != main_gap
    lab = np.array([odd[max(0, k - 4):k + 5].any() for k in range(len(gaps))])   # 前后 4 个间隔里有「不一样的」就算不均匀
    out, k = [], 0
    while k < len(gaps):
        j = k
        while j < len(gaps) and lab[j] == lab[k]: j += 1
        out.append([int(ev[k]), int(ev[j]) + 1, gaps[k:j].tolist(), bool(lab[k])]); k = j
    # 太短的子段（< 3 个间隔）并入前一段
    merged = []
    for r in out:
        if merged and len(r[2]) < 3: merged[-1][1] = r[1]; merged[-1][2] += r[2]
        else: merged.append(r)
    merged[0][0] = 0; merged[-1][1] = n
    return [tuple(r) for r in merged]


def runs(mask):
    """布尔数组里连续 True 的区间 [(i0, i1), ...]，i1 不含。"""
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]: j += 1
            out.append((i, j)); i = j
        else: i += 1
    return out


def ts(t): return f'{int(t // 60):d}:{t % 60:05.2f}'


def main():
    ap = argparse.ArgumentParser(description='motion_check: 卡顿 / 静止过久 / 镜头抖')
    ap.add_argument('video'); ap.add_argument('--start', type=float, default=0); ap.add_argument('--end', type=float, default=0)
    ap.add_argument('--static-sec', type=float, default=2.0, help='静止多久算「过久」（秒）')
    ap.add_argument('--static-thr', type=float, default=1.0, help='和 0.5 秒前那帧的平均差低于多少算静止（0–255，160 宽灰度）')
    ap.add_argument('--move-thr', type=float, default=1.0, help='区域帧差超过多少算「在运动」（0–255）')
    ap.add_argument('--jitter-px', type=float, default=1.5, help='抖动残差阈值，1080p 像素')
    ap.add_argument('--csv'); ap.add_argument('--json')
    a = ap.parse_args()

    W0, H0, fps = probe(a.video)
    scale = 1920 / AW                       # 320 宽的 1 像素 = 1080p 的 6 像素
    LAG = max(1, int(round(fps / 2)))       # 静止判断：和 0.5 秒前比（慢速推拉摇移会累积出差异，颗粒噪声不会）
    D, TD, DK, DX, DY, PR, SP = [], [], [], [], [], [], []
    hist = []
    for fr in frames(a.video, a.start, a.end, W0, H0):
        small = fr[:fr.shape[0] // 2 * 2].reshape(fr.shape[0] // 2, 2, AW // 2, 2).mean(axis=(1, 3))   # 160 宽，颗粒再平均一次
        if hist:
            prev, prev_s = hist[-1]
            ad = np.abs(fr - prev); h, w = ad.shape
            D.append(float(ad.mean()))
            TD.append(ad[:h // GY * GY, :w // GX * GX].reshape(GY, h // GY, GX, w // GX).mean(axis=(1, 3)).ravel())
            old = hist[-LAG][1] if len(hist) >= LAG else hist[0][1]
            DK.append(float(np.abs(small - old).mean()))
            dx, dy, nc, sp = global_shift(prev, fr); DX.append(dx); DY.append(dy); PR.append(nc); SP.append(sp)
        hist.append((fr, small)); hist = hist[-LAG:]
    n = len(D)
    if n < 3: print('帧太少'); return
    D = np.array(D); TD = np.array(TD); DK = np.array(DK); DX = np.array(DX) * scale; DY = np.array(DY) * scale; PR = np.array(PR); SP = np.array(SP)
    t_of = lambda i: a.start + (i + 1) / fps      # 第 i 个差值属于第 i+1 帧
    def fmt(i0, i1):
        f0, f1 = int(round(t_of(i0) * fps)), int(round(t_of(i1 - 1) * fps))
        return f'{ts(t_of(i0))}–{ts(t_of(i1 - 1))}（f{f0}–f{f1}，{(i1 - i0) / fps:.1f}s）'

    # ---- 切镜头：帧差远大于前后 ----
    cut = np.zeros(n, bool)
    for i in range(n):
        nb = max(D[i - 1] if i > 0 else 0, D[i + 1] if i + 1 < n else 0)
        if D[i] > 12 and D[i] > 3.5 * max(nb, 0.5): cut[i] = True
    near_cut = cut.copy()
    for i in np.where(cut)[0]: near_cut[i:i + LAG + 1] = True     # 切点后 LAG 帧的「和 0.5 秒前比」会跨切点
    report = []

    # ---- 1. 静止过久 ----
    st = (DK < a.static_thr) & (D < a.static_thr) & ~cut
    st[near_cut & ~cut] = (D[near_cut & ~cut] < a.static_thr * 0.6)
    for i0, i1 in runs(st):
        if (i1 - i0) / fps >= a.static_sec:
            report.append(dict(kind='静止过久', i0=i0, i1=i1, why=f'0.5 秒内平均变化 {np.median(DK[i0:i1]):.2f}、相邻帧差 {np.median(D[i0:i1]):.2f}（阈值 {a.static_thr}），画面几乎不动'))

    # ---- 2. 抖动：相位相关位移的符号来回翻转 ----
    WIN, STEP = int(round(fps)), max(1, int(round(fps / 6)))
    jit = np.zeros(n, bool)       # 被判为抖动的帧（卡顿检测里用来排除：抖动本身也会造成帧差尖峰）
    ok = (PR >= 4) & (SP < 0.5) & ~cut          # 至少 4 块可信、彼此一致（离散度 < 0.5px@320 = 3px@1080p）
    for axis, V in (('竖直', DY), ('水平', DX)):
        Vm = np.where(ok, V, np.nan)
        pad = np.pad(Vm, 4, mode='edge')
        med = np.array([np.nanmedian(pad[i:i + 9]) if np.isfinite(pad[i:i + 9]).any() else 0.0 for i in range(n)])
        r = np.where(ok, V - med, 0.0)            # 残差 = 位移 - 附近 9 帧的中位数（去掉正常的匀速平移）
        sig = np.abs(r) > a.jitter_px
        sgn = np.sign(r) * sig
        flag = np.zeros(n, bool)
        for s in range(0, max(1, n - WIN + 1), STEP):
            e = min(n, s + WIN)
            idx = np.where(sgn[s:e] != 0)[0]
            if len(idx) < 4: continue
            sv = sgn[s:e][idx]
            if int((sv[1:] != sv[:-1]).sum()) >= 3:
                flag[s + idx[0]: s + idx[-1] + 1] = True
        for i0, i1 in runs(flag):
            ss = sgn[i0:i1][sgn[i0:i1] != 0]
            flips = int((ss[1:] != ss[:-1]).sum()) if len(ss) > 1 else 0
            if flips < 3: continue
            big = np.where(sig[i0:i1])[0][:8] + i0
            jit[i0:i1] = True
            report.append(dict(kind='抖动', i0=i0, i1=i1,
                               why=f'{axis}位移来回翻转 {flips} 次，最大偏离 {np.abs(r[i0:i1]).max():.1f}px（1080p）；'
                                   f'例：' + '，'.join(f'f{int(round(t_of(i) * fps))} {r[i]:+.1f}' for i in big)))

    # 同一时间段的竖直/水平抖动、相隔不到 0.5 秒的抖动合成一条
    jr = sorted([r for r in report if r['kind'] == '抖动'], key=lambda r: r['i0']); report = [r for r in report if r['kind'] != '抖动']
    for r in jr:
        if report and report[-1]['kind'] == '抖动' and r['i0'] <= report[-1]['i1'] + fps / 2:
            last = report[-1]; last['i1'] = max(last['i1'], r['i1'])
            if r['why'][:2] not in [w[:2] for w in last['parts']]: last['parts'].append(r['why'])
        else: report.append(dict(r, parts=[r['why']]))
    for r in report:
        if r['kind'] == '抖动': r['why'] = '；'.join(p.split('；例')[0] for p in r['parts']) + '；例' + r['parts'][0].split('；例')[1]

    # ---- 3. 卡顿（全局 + 每个区域）----
    names = [f'第{k // GX + 1}排第{k % GX + 1}列（x{(k % GX) * 1920 // GX}–{(k % GX + 1) * 1920 // GX}, y{(k // GX) * 1080 // GY}–{(k // GX + 1) * 1080 // GY}）' for k in range(GX * GY)]
    series = [('全画面', D)] + [(names[k], TD[:, k]) for k in range(GX * GY)]
    WIN, STEP = int(round(fps)), max(1, int(round(fps / 6)))
    hits = []          # 每个命中的 1 秒窗口：(s, e, 区域名, 间隔列表, 是否不均匀, 类型)
    for name, d in series:
        for s in range(0, max(1, n - WIN + 1), STEP):
            e = min(n, s + WIN)
            if cut[s:e].any(): continue
            seg = d[s:e]; ref = np.percentile(seg, 80)
            if ref < a.move_thr: continue
            # 形态一「停顿」：运动中周期性出现几乎为零的帧差（整块画面每 N 帧才更新一次）
            hold = seg < 0.2 * ref
            if hold.mean() >= 0.3:
                ch = np.where(~hold)[0]
                if len(ch) >= 3:
                    gaps = np.diff(ch)
                    if np.median(gaps) >= 2:
                        vals, cnt = np.unique(gaps, return_counts=True)
                        uneven = int((cnt >= max(2, 0.15 * len(gaps))).sum()) > 1
                        hits.append((s, e, name, gaps.tolist(), uneven, 'hold')); continue
            # 形态二「跳变」：其他东西每帧都在动（帧差不为零），但某样东西每 N 帧跳一大步 → 帧差周期性尖峰。
            # 成片的诡盘就是这种：小鸟每帧都在拍翅，转盘却每秒跳 8 下（4/4/4/3 帧交替）。
            base = np.median(seg)
            spk = np.where((seg > 1.8 * base) & (seg - base > 0.8))[0]
            if 3 <= len(spk) <= 0.5 * len(seg):
                gaps = np.diff(spk)
                if 2 <= np.median(gaps) <= 10 and gaps.std() <= 0.35 * gaps.mean():   # 尖峰要有周期性（排除偶发的闪白、节拍）
                    vals, cnt = np.unique(gaps, return_counts=True)
                    uneven = int((cnt >= max(2, 0.15 * len(gaps))).sum()) > 1
                    hits.append((s, e, name, gaps.tolist(), uneven, 'spike'))
    # 合并：先丢掉被抖动解释的「跳变」窗口；再把时间上重叠的窗口（不论区域、形态）合成一段，
    #       用整段汇总的间隔分布判断均不均匀（单个 1 秒窗口太短，会在交界处来回判）。
    hits = [h for h in hits if not (h[5] == 'spike' and jit[h[0]:h[1]].mean() > 0.3)]
    hits.sort()
    groups = []
    for h in hits:
        if groups and h[0] < groups[-1][1]: groups[-1][1] = max(groups[-1][1], h[1]); groups[-1][2].append(h)
        else: groups.append([h[0], h[1], [h]])
    for i0, i1, items in groups:
        glob = [h for h in items if h[2] == '全画面']
        if not glob and len(items) < 2: continue                 # 只有一个区域、只命中一个窗口：证据太弱，不报
        use = glob or items
        regions = []
        for h in items:
            if h[2] not in regions: regions.append(h[2])
        mode = 'hold' if sum(h[5] == 'hold' for h in use) * 2 >= len(use) else 'spike'
        if glob: d = D
        else:
            best = max(regions, key=lambda r: sum(h[2] == r for h in items)); d = TD[:, names.index(best)]
        reg = '全画面' if glob else '、'.join(regions[:3]) + (f' 等 {len(regions)} 个区域' if len(regions) > 3 else '')
        what = '帧才变一次' if mode == 'hold' else '帧出现一次大跳变（其余帧只有小幅变化）'
        for r0, r1, g, uneven in cadence_runs(d[i0:i1], mode):
            if len(g) < 2 or (r1 - r0) < 0.5 * fps: continue
            g = np.array(g); vals, cnt = np.unique(g, return_counts=True)
            top = sorted(int(v) for v, c in zip(vals, cnt) if c >= 0.1 * len(g))
            cover = sum(int(c) for v, c in zip(vals, cnt) if int(v) in top) / len(g)
            # 真正的步进节奏：主要间隔是一个值（均匀）或相邻两个整数（如 3/4、7/8、1/2 = 不整除），且覆盖 ≥75% 的事件；
            # 「1/5/9」「6/10」这种杂乱间隔是内容本身的不规则变化（闪烁、随机故障），不报。
            if not top or max(top) - min(top) > 1 or cover < 0.75 or max(top) < 2: continue
            uneven = len(top) > 1
            rate = fps / g.mean()
            why = (f'{reg}：每 {"/".join(map(str, top))} {what}，约 {rate:.1f} 次/秒，'
                   + ('不均匀 → 每秒步数不整除帧率，改用 stepAt()' if uneven else '均匀步进 → 若非刻意的定格风格，改为每帧一格或加 motionBlur()'))
            report.append(dict(kind='卡顿', i0=i0 + r0, i1=i0 + r1, why=why))

    # ---- 输出 ----
    order = {'卡顿': 0, '抖动': 1, '静止过久': 2}
    report.sort(key=lambda r: (r['i0'], order[r['kind']]))
    print(f'motion_check: {a.video}  {W0}x{H0} @ {fps:g}fps，分析 {n + 1} 帧（{t_of(-1):.2f}s–{t_of(n - 1):.2f}s）')
    print(f'  帧差中位数 {np.median(D):.2f}；切镜头 {int(cut.sum())} 处' + (f'：{", ".join(f"{t_of(i):.2f}s" for i in np.where(cut)[0][:15])}' + (' …' if cut.sum() > 15 else '') if cut.any() else ''))
    if not report: print('  未发现卡顿 / 静止过久 / 抖动。')
    for r in report: print(f'  [{r["kind"]}] {fmt(r["i0"], r["i1"])}  {r["why"]}')
    if a.json:
        json.dump([dict(kind=r['kind'], t0=round(t_of(r['i0']), 3), t1=round(t_of(r['i1'] - 1), 3), why=r['why']) for r in report],
                  open(a.json, 'w'), ensure_ascii=False, indent=1)
    if a.csv:
        with open(a.csv, 'w') as f:
            f.write('frame,t,diff,diff_lag,dx,dy,n_conf_tiles,spread,cut\n')
            for i in range(n): f.write(f'{int(round(t_of(i) * fps))},{t_of(i):.3f},{D[i]:.3f},{DK[i]:.3f},{DX[i]:.2f},{DY[i]:.2f},{int(PR[i])},{SP[i]:.2f},{int(cut[i])}\n')


if __name__ == '__main__':
    main()
