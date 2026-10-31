#!/usr/bin/env python3
"""rq.py —— 并行分段渲染：把 a..b 秒切成若干段，同时开几个 render.js 渲，断点续跑，最后自动拼成一条。

用法（在 template/ 里运行，环境变量 PAGE= GPU= 会传给每个 render.js）:
  python3 rq.py 0 60                              默认每段 8 秒、2 个并行、输出到 render_out/，拼成 render_out/full.mp4
  python3 rq.py 0 60 --chunk 6 --workers 3 --out ../render/a1 --name act1.mp4
  python3 rq.py 0 60 --splits 12.5,30             额外强制在这些时刻断开（比如音乐段落）
  python3 rq.py 0 60 --check                      拼好后跑一遍 motion_check.py
  python3 rq.py 0 60 --plan                       只打印分段计划，不渲染

切分规则:
  - 切点都对齐到 30fps 帧格（每段帧号连续、不重不漏，ffmpeg concat 直接拷贝，不重新编码）。
  - 不会切在有状态镜头（shots.js 里带 state 的 shot，或标了 solid: true 的）中间；
    如果后一个镜头用 xin 交叉溶解，前一个有状态镜头在溶解期间还要继续演，所以不可切的范围延伸到溶解结束。
    （从中间切开结果也是对的 —— syncState 会从镜头起点重放 —— 但那一段要白算整段前缀，可能慢几倍。）
  - 镜头列表从页面读（window.shotList()）；旧式 scene.js 自己写 renderFrame 时没有镜头表，就只按 --chunk 均分。
断点续跑: 每段渲完 render.js 会写 c_XXXXXX.mp4.done（内容是帧数）。重跑时帧数对得上的段直接跳过；
          中途崩溃/被杀的段没有 .done，会重渲。改了画面要重渲某段，删掉它的 .done 即可。
输出: <out>/c_<起始帧>.mp4（每段）、<out>/list.txt（concat 列表，可以直接给 motion_check.py）、<out>/<name>（拼好的整条）。
"""
import sys, os, json, argparse, subprocess, time
from concurrent.futures import ThreadPoolExecutor

FPS = 30
HERE = os.path.dirname(os.path.abspath(__file__))

SHOTLIST_JS = r"""
const {chromium}=require('playwright');
(async()=>{const br=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--disable-accelerated-2d-canvas','--disable-gpu-rasterization']});
 const p=await br.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>console.error('[err]',e.message));
 await p.goto('file://'+process.argv[1]+'/'+(process.env.PAGE||'film.html'));
 const r=await p.evaluate(()=>typeof shotList==='function'?shotList():[]);
 console.log(JSON.stringify(r));await br.close();})();
"""


def shot_list():
    """从页面读镜头表（不调用 initFilm，只需要 shot() 注册的结果，所以很快）。"""
    r = subprocess.run(['node', '-e', SHOTLIST_JS, HERE], capture_output=True, text=True, cwd=HERE, env=os.environ)
    if r.returncode != 0:
        print('读镜头表失败（按均分处理）：', r.stderr.strip()[:300]); return []
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return []


def plan(F0, F1, chunk_f, shots, splits):
    """返回 [(f0, f1), ...]。solid = 不可切的帧区间 (sa, sb)：切点不能落在 sa < c < sb。"""
    solid = []
    for i, s in enumerate(shots):
        if not s.get('solid'): continue
        sa, sb = round(s['a'] * FPS), round(s['b'] * FPS)
        if i + 1 < len(shots) and shots[i + 1].get('xin'):           # 下一个镜头交叉溶解时，这个镜头还在演
            sb = max(sb, round((shots[i + 1]['a'] + shots[i + 1]['xin']) * FPS))
        solid.append((sa, sb, s.get('src', '')))
    inside = lambda c: next(((sa, sb, src) for sa, sb, src in solid if sa < c < sb), None)
    forced = sorted({round(x * FPS) for x in splits if F0 < round(x * FPS) < F1})
    out, cur = [], F0
    while cur < F1:
        nxt = min(cur + chunk_f, F1)
        fc = [c for c in forced if cur < c < nxt]
        if fc: nxt = fc[0]
        hit = inside(nxt)
        if hit and nxt < F1:
            sa, sb, _ = hit
            nxt = sa if sa > cur else min(sb, F1)                    # 退到镜头起点；如果起点就是本段起点，就把整个镜头包进来
        out.append((cur, nxt)); cur = nxt
    # 太短的段（< 1/3 段长）并进前一段：去掉一个切点永远是安全的，只是那段变长一点
    merged = []
    for c in out:
        if merged and (c[1] - c[0] < chunk_f / 3 or merged[-1][1] - merged[-1][0] < chunk_f / 3) and c[1] - merged[-1][0] <= chunk_f * 1.5 \
                and merged[-1][1] not in forced:
            merged[-1] = (merged[-1][0], c[1])
        else: merged.append(c)
    return merged, solid


def main():
    ap = argparse.ArgumentParser(description='rq.py 并行分段渲染')
    ap.add_argument('a', type=float); ap.add_argument('b', type=float)
    ap.add_argument('--chunk', type=float, default=8.0); ap.add_argument('--workers', type=int, default=2)
    ap.add_argument('--out', default='render_out'); ap.add_argument('--name', default='full.mp4')
    ap.add_argument('--splits', default=''); ap.add_argument('--check', action='store_true'); ap.add_argument('--plan', action='store_true')
    a = ap.parse_args()
    out = os.path.abspath(a.out); os.makedirs(out, exist_ok=True)
    F0, F1 = round(a.a * FPS), round(a.b * FPS)
    shots = shot_list()
    chunks, solid = plan(F0, F1, max(1, round(a.chunk * FPS)), shots, [float(x) for x in a.splits.split(',') if x.strip()])
    print(f'rq: {a.a}–{a.b}s（f{F0}–f{F1}），镜头 {len(shots)} 个，其中不可切 {len(solid)} 段；分 {len(chunks)} 段，{a.workers} 路并行 → {out}')
    for sa, sb, src in solid: print(f'  不可切：f{sa}–f{sb}（{sa / FPS:.2f}–{sb / FPS:.2f}s）{src}')
    for c0, c1 in chunks: print(f'  段 c_{c0:06d}：f{c0}–f{c1}（{c0 / FPS:.2f}–{c1 / FPS:.2f}s，{(c1 - c0) / FPS:.1f}s）')
    if a.plan: return

    def run(c):
        c0, c1 = c; fn = f'{out}/c_{c0:06d}.mp4'
        if os.path.exists(fn + '.done') and open(fn + '.done').read().strip() == str(c1 - c0): return (c, 'skip', 0)
        t0 = time.time()
        r = subprocess.run(['node', 'render.js', repr(c0 / FPS), repr(c1 / FPS), fn], cwd=HERE, env=os.environ, capture_output=True, text=True)
        ok = r.returncode == 0 and os.path.exists(fn + '.done')
        if not ok: print(f'  段 c_{c0:06d} 失败：', (r.stdout + r.stderr).strip()[-500:])
        return (c, 'ok' if ok else 'FAIL', time.time() - t0)
    t0 = time.time()
    with ThreadPoolExecutor(a.workers) as ex:
        for (c0, c1), st, dt in ex.map(run, chunks):
            print(f'  c_{c0:06d} {st}' + (f'  {dt:.0f}s（{dt * 1000 / (c1 - c0):.0f} ms/帧）' if st == 'ok' else ''), flush=True)
    bad = [c for c in chunks if not os.path.exists(f'{out}/c_{c[0]:06d}.mp4.done')]
    if bad: print(f'有 {len(bad)} 段没渲完，重跑本命令即可续跑'); sys.exit(1)
    lst = f'{out}/list.txt'
    open(lst, 'w').write(''.join(f"file 'c_{c0:06d}.mp4'\n" for c0, c1 in chunks))
    full = os.path.join(out, a.name)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', full], check=True)
    n = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', full],
                       capture_output=True, text=True).stdout.strip()
    print(f'拼好 {full}：{n} 帧（应为 {F1 - F0}）' + ('' if n == str(F1 - F0) else '  <<< 帧数不对'), f'，总用时 {time.time() - t0:.0f}s')
    if a.check:
        subprocess.run([sys.executable, os.path.join(HERE, 'motion_check.py'), lst])


if __name__ == '__main__':
    main()
