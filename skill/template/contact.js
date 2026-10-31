// contact.js —— 一个镜头的「接触表」：把一段时间里的很多帧拼成一张网格图，一眼看运动。
//
// 用法:
//   node contact.js out.jpg <a> <b> <N>                 a..b 秒之间均匀取 N 帧（含两端，对齐到 30fps 帧格）
//   node contact.js out.jpg <a> - <N> --consecutive     从 a 秒起连续 N 帧（每格间隔 1/30 秒）
// 选项:
//   --cols 4              列数（默认按 16:9 自动，12 帧 = 4×3）
//   --cell 480            每格宽度（像素，默认 480；总宽 = cols×cell）
//   --crop x,y,w,h        只看画面里的一块（1920×1080 坐标），用来放大检查角色细节，如 --crop 600,200,640,360
//   --diff                每格下面再叠一条「和上一格的差异」热度条（红 = 变化大，黑 = 没变），连续模式下最有用
// 环境变量同 render.js / snap.js：PAGE=别的.html  GPU=1
//
// 输出: out.jpg，每格左上角标「秒数 / 帧号」；--diff 时右上角再标和上一格的平均差异（0–255）。
// 怎么看:
//   - 均匀模式（一个镜头 8–16 格）：看角色每个姿态是否完整（翅膀断线、肢体穿插、位置偏离画板中心），构图有没有漂移。
//   - 连续模式（12–24 格）：看运动是否连贯。相邻几格完全一样又突然跳一大步 = 卡顿/步进；
//     画面整体上下来回错位 = 镜头抖；物体一格跳过自身宽度一半以上 = 需要 motionBlur。
//   - 细线条要用 --crop 放大看（成片里 lineWidth 太细的剪影在缩略图里看不出断线）。
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');

function parseArgs(argv) {
  const pos = [], o = { cols: 0, cell: 480, crop: null, consecutive: false, diff: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--consecutive') o.consecutive = true;
    else if (a === '--diff') o.diff = true;
    else if (a === '--cols') o.cols = +argv[++i];
    else if (a === '--cell') o.cell = +argv[++i];
    else if (a === '--crop') o.crop = argv[++i].split(',').map(Number);
    else pos.push(a);
  }
  if (pos.length < 4) { console.log('用法: node contact.js out.jpg a b N [--consecutive] [--cols 4] [--cell 480] [--crop x,y,w,h] [--diff]'); process.exit(1); }
  o.out = pos[0]; o.a = +pos[1]; o.b = pos[2] === '-' ? NaN : +pos[2]; o.n = Math.max(1, Math.round(+pos[3]));
  return o;
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const FPS = 30;
  // 要渲染的帧号：一律对齐到整数帧，保证和 render.js 渲出来的帧完全一致
  let frames = [];
  if (o.consecutive) { const f0 = Math.round(o.a * FPS); for (let i = 0; i < o.n; i++) frames.push(f0 + i); }
  else {
    if (!(o.b > o.a)) { console.log('均匀模式需要 b > a'); process.exit(1); }
    for (let i = 0; i < o.n; i++) frames.push(Math.round((o.n === 1 ? o.a : o.a + (o.b - o.a) * i / (o.n - 1)) * FPS));
  }
  const crop = o.crop || [0, 0, 1920, 1080];
  const cols = o.cols || Math.min(o.n, Math.ceil(Math.sqrt(16 / 9 * o.n * crop[3] / crop[2])));  // 让整张图接近 16:9（12 格 → 4×3）
  const rows = Math.ceil(o.n / cols), cw = o.cell, ch = Math.round(cw * crop[3] / crop[2]), bar = o.diff ? 14 : 0;

  const br = await chromium.launch({ headless: !process.env.HEADFUL, args: process.env.GPU ? ['--use-gl=angle', '--use-angle=' + (process.env.GPU === '1' ? 'd3d11' : process.env.GPU), '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--disable-accelerated-2d-canvas', '--disable-gpu-rasterization'] });
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 } }); p.setDefaultTimeout(900000);
  p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()); });
  p.on('pageerror', e => console.log('[err]', e.message));
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'film.html'));
  let t0 = Date.now(); await p.evaluate('initFilm()'); console.log('init', Date.now() - t0, 'ms');

  // 在页面里建一张大网格画布，每渲染一帧就缩小贴进去（不需要 Python/PIL）
  await p.evaluate(({ cols, rows, cw, ch, bar }) => {
    const g = document.createElement('canvas'); g.width = cols * cw; g.height = rows * (ch + bar);
    const x = g.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0, 0, g.width, g.height);   // 品红 = 空格
    window.__CS = { g, x, prev: null };
  }, { cols, rows, cw, ch, bar });

  t0 = Date.now();
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const info = await p.evaluate(({ i, f, cols, cw, ch, bar, crop, diff }) => {
      renderFrame(f / 30);
      const S = window.__CS, src = document.getElementById('c');
      const gx = (i % cols) * cw, gy = Math.floor(i / cols) * (ch + bar);
      S.x.imageSmoothingQuality = 'high'; S.x.drawImage(src, crop[0], crop[1], crop[2], crop[3], gx, gy, cw, ch);
      let md = null;
      if (diff) {   // 和上一格比：在 160 宽的灰度缩略图上算逐列平均差，画成热度条
        const sw = 160, sh = Math.max(1, Math.round(160 * crop[3] / crop[2]));
        const tc = document.createElement('canvas'); tc.width = sw; tc.height = sh; const tx = tc.getContext('2d');
        tx.drawImage(src, crop[0], crop[1], crop[2], crop[3], 0, 0, sw, sh);
        const d = tx.getImageData(0, 0, sw, sh).data, gray = new Float32Array(sw * sh);
        for (let k = 0; k < sw * sh; k++) gray[k] = 0.299 * d[k * 4] + 0.587 * d[k * 4 + 1] + 0.114 * d[k * 4 + 2];
        if (S.prev) {
          let tot = 0; const colD = new Float32Array(sw);
          for (let k = 0; k < sw * sh; k++) { const v = Math.abs(gray[k] - S.prev[k]); tot += v; colD[k % sw] += v / sh; }
          md = tot / (sw * sh);
          for (let c = 0; c < sw; c++) { const v = Math.min(1, colD[c] / 40); S.x.fillStyle = `rgb(${255 * Math.sqrt(v)},${80 * v},0)`; S.x.fillRect(gx + c * cw / sw, gy + ch, cw / sw + 1, bar); }
        } else { S.x.fillStyle = '#333'; S.x.fillRect(gx, gy + ch, cw, bar); }
        S.prev = gray;
      }
      // 标签：时间 + 帧号
      const lab = (f / 30).toFixed(3) + 's  f' + f;
      S.x.font = '600 20px monospace'; S.x.textBaseline = 'top';
      const lw = S.x.measureText(lab).width + 12; S.x.fillStyle = 'rgba(255,230,0,.92)'; S.x.fillRect(gx, gy, lw, 26);
      S.x.fillStyle = '#000'; S.x.fillText(lab, gx + 6, gy + 3);
      if (md != null) { const l2 = 'Δ' + md.toFixed(1), w2 = S.x.measureText(l2).width + 12; S.x.fillStyle = md < 0.3 ? 'rgba(255,60,60,.92)' : 'rgba(0,0,0,.7)'; S.x.fillRect(gx + cw - w2, gy, w2, 26); S.x.fillStyle = '#fff'; S.x.fillText(l2, gx + cw - w2 + 6, gy + 3); }
      // 格子分隔线
      S.x.strokeStyle = '#000'; S.x.lineWidth = 2; S.x.strokeRect(gx + 1, gy + 1, cw - 2, ch + bar - 2);
      return md;
    }, { i, f, cols, cw, ch, bar, crop, diff: o.diff });
    if (info != null) process.stdout.write(`f${f} Δ${info.toFixed(2)}  `);
  }
  if (o.diff) console.log();
  const d = await p.evaluate(() => window.__CS.g.toDataURL('image/jpeg', 0.88));
  fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
  fs.writeFileSync(o.out, Buffer.from(d.split(',')[1], 'base64'));
  console.log(`写出 ${o.out}：${frames.length} 格（${cols}×${rows}，每格 ${cw}×${ch}），帧 ${frames[0]}..${frames[frames.length - 1]}，渲染 ${((Date.now() - t0) / frames.length).toFixed(0)} ms/格`);
  await br.close();
})();
