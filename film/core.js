// ===== 正片骨架：全局时间线上的镜头表 =====
const SHOTS = [];
let G1080, G720, G540, HMTEX;
function srcLine() { // 调用 shot() 的源文件与行号（角标用：真实的文件名:行号）
  const st = (new Error().stack || '').split('\n');
  for (const l of st) { const m = l.match(/\/([a-z0-9_]+\.js):(\d+):\d+/i); if (m && m[1] !== 'core.js') return m[1] + ':' + m[2]; }
  return '';
}
function shot(a, b, o) { const s = Object.assign({ a, b, src: srcLine() }, o); SHOTS.push(s); return s; }
const LN = id => TLD.lines[id];                       // [开始, 结束]（全局秒）
const LS = id => TLD.lines[id][0], LE = id => TLD.lines[id][1];
function GP(label, after = 0) { const g = TLD.gaps.find(g => g[2] === label && g[0] >= after - 1e-3); if (!g) throw new Error('gap ' + label); return g; }
const SEG = n => TLD.segs.find(s => s[0] === n);

function syncState(s, f) {
  const f0 = Math.round(s.a * FPS);
  if (s._f === undefined || f < s._f) { s.flow.init(); s._f = f0 - 1; }
  while (s._f < f) { s._f++; s.flow.step(s._f, s._f / FPS - s.a); }
}

// ---- 统一后期：辉光（可选）+ 颗粒 + 暗角 ----
const [BLm, BLx] = mk2d(480, 270), [BLm2, BLx2] = mk2d(240, 135);
function bloom(ctx, amt = 0.6, thr = 0) {
  BLx.globalCompositeOperation = 'source-over'; BLx.filter = 'none'; BLx.drawImage(ctx.canvas, 0, 0, 480, 270);
  if (thr > 0) { BLx.globalCompositeOperation = 'multiply'; BLx.fillStyle = `rgb(${255 * (1 - thr)},${255 * (1 - thr)},${255 * (1 - thr)})`; BLx.fillRect(0, 0, 480, 270); BLx.globalCompositeOperation = 'source-over'; }
  BLx2.clearRect(0, 0, 240, 135); BLx2.filter = 'blur(6px)'; BLx2.drawImage(BLm, 0, 0, 240, 135); BLx2.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = amt; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(BLm2, 0, 0, W, H); ctx.globalAlpha = amt * 0.6; BLx.filter = 'blur(3px)'; BLx.drawImage(BLm, 0, 0); BLx.filter = 'none'; ctx.drawImage(BLm, 0, 0, W, H); ctx.restore();
}
function cornerTag(ctx, s, a = 1) {
  if (!s.src || s.tag === false) return;
  ctx.save(); ctx.globalAlpha = 0.62 * a; ctx.font = `400 30px ${FONT.mono}`; ctx.textAlign = 'right'; ctx.fillStyle = s.tagDark ? '#1b1b1b' : '#e9e4d8';
  ctx.shadowColor = s.tagDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.8)'; ctx.shadowBlur = 8;
  ctx.fillText(s.tag || s.src, W - 64, 76); ctx.restore();
}
function fadeBlack(ctx, a) { if (a <= 0) return; ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`; ctx.fillRect(0, 0, W, H); }
function flash(ctx, a, col = '255,245,225') { if (a <= 0) return; ctx.fillStyle = `rgba(${col},${clamp(a)})`; ctx.fillRect(0, 0, W, H); }

// ---- 幕卡 ----
function actCard(ctx, lt, dur, o) {
  // o: {n:'第二幕', name:'机器时代', years:'1958 — 1997', bg, fg, accent, style}
  ctx.fillStyle = o.bg || '#000'; ctx.fillRect(0, 0, W, H);
  if (o.under) o.under(ctx, lt);
  const a = sstep(0.15, 0.7, lt) * (1 - sstep(dur - 0.5, dur, lt));
  ctx.save(); ctx.globalAlpha = a;
  txt(ctx, o.n, W / 2, 400, { size: 40, align: 'center', font: FONT.sans, color: o.accent || C.gold, ls: 18 });
  const sp = 1 + 0.03 * lt;
  ctx.translate(W / 2, 560); ctx.scale(sp, sp);
  txt(ctx, o.name, 0, 0, { size: 150, w: 900, align: 'center', base: 'middle', color: o.fg || C.cream, ls: 24, shadow: o.glow || 'rgba(0,0,0,0)', blur: 30 });
  ctx.restore();
  txt(ctx, o.years, W / 2, 720, { size: 40, align: 'center', font: FONT.grot, color: o.fg || C.cream, alpha: 0.7 * sstep(0.5, 1.1, lt) * (1 - sstep(dur - 0.5, dur, lt)), ls: 10 });
}

// ---- 代码面板（≥30px，≤6 行） ----
function codeBox(ctx, lines, x, y, lt, o = {}) {
  const size = o.size || 32, lh = size * 1.55, rate = o.rate || 60;
  ctx.save(); ctx.font = `400 ${size}px ${FONT.mono}`;
  const w = o.w || Math.max(...lines.map(l => ctx.measureText(l).width)) + 72, h = lines.length * lh + 50;
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = o.bg || 'rgba(6,9,16,0.84)'; ctx.strokeStyle = o.border || 'rgba(242,196,109,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
  let budget = Math.floor(lt * rate);
  lines.forEach((ln, li) => {
    const show = ln.slice(0, Math.max(0, budget)); budget -= ln.length;
    let cx = x + 36; const cy = y + 25 + size * 1.05 + li * lh;
    const toks = show.split(/(\/\/.*$|\b[a-zA-Z_]+\b|\d+\.?\d*)/);
    for (const tk of toks) {
      if (!tk) continue;
      ctx.fillStyle = tk.startsWith('//') ? 'rgba(160,170,190,0.8)' : /^(float|vec2|vec3|vec4|return|for|if|const|let|function|int)$/.test(tk) ? '#6FD3FF' : /^(sin|cos|noise|fbm|dot|mix|floor|fract|length|smoothstep|grad|random|abs)$/.test(tk) ? '#F2C46D' : /^\d/.test(tk) ? '#FF8FB8' : (o.fg || '#E8E4DA');
      if (o.hl != null && li === o.hl) ctx.fillStyle = o.hlc || '#FFE7A8';
      ctx.fillText(tk, cx, cy); cx += ctx.measureText(tk).width;
    }
    if (budget > -2 && budget <= 0 && (Math.floor(lt * 3) % 2 === 0)) { ctx.fillStyle = '#F2C46D'; ctx.fillRect(cx + 2, cy - size * .8, size * .5, size); }
  });
  ctx.restore(); return [w, h];
}
// 年代字标（左上，不挡字幕）
function eraTag(ctx, s, sub, a = 1, dark = false) {
  if (a <= 0) return; const c = dark ? '#151515' : '#fff', sh = dark ? 'rgba(239,230,210,.9)' : 'rgba(0,0,0,.85)';
  txt(ctx, s, 72, 112, { size: 60, w: 600, font: FONT.grot, color: c, shadow: sh, blur: 16, alpha: a });
  if (sub) txt(ctx, sub, 74, 162, { size: 36, font: FONT.sans, color: c, shadow: sh, blur: 10, alpha: a * 0.85 });
}
// 屏幕中部的大字（不和字幕重叠：y ≤ 860）
function bigWords(ctx, s, y, a, o = {}) { txt(ctx, s, W / 2, y, Object.assign({ size: 96, w: 700, align: 'center', color: '#FFF3DA', alpha: a, shadow: 'rgba(0,0,0,.6)', blur: 30 }, o)); }

// ================= 入口 =================
const INITS = [], PRELOAD = [];
function loadImg(src) { return new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; }); }
async function initFilm() {
  await document.fonts.ready;
  for (const f of ['400 40px "Noto Serif CJK SC"', '700 40px "Noto Serif CJK SC"', '900 40px "Noto Serif CJK SC"', '500 40px "Noto Sans CJK SC"', '500 40px "Cormorant Garamond"', '400 40px "JetBrains Mono"', '600 40px "Space Grotesk"', '400 40px "Press Start 2P"']) { try { await document.fonts.load(f, '写出来的影像Ag'); } catch (e) { } }
  for (const f of PRELOAD) await f();
  G1080 = makeGL(W, H); G720 = makeGL(1280, 720); G540 = makeGL(960, 540);
  for (const k in SH) { for (const g of [G1080, G720, G540]) g.add(k, SH[k]); }
  return 'ok';
}
let HM_READY = false;
function needHM() { // 地形高度图（只在用到的镜头里生成）
  if (HM_READY) return; HM_READY = true;
  const N = 1024, hm = new Float32Array(N * N); let mn = 1e9, mx = -1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0, a = 0.5, fq = 4, ridge = 0;
    for (let o = 0; o < 7; o++) { const n = pnoise2(x / N * fq, y / N * fq, fq); s += a * n; if (o < 5) ridge += a * Math.pow(1 - Math.abs(n * 1.4), 2); fq *= 2; a *= 0.5; }
    const v = s * 0.55 + ridge * 0.6; hm[y * N + x] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  for (let i = 0; i < hm.length; i++) { const v = (hm[i] - mn) / (mx - mn); hm[i] = Math.pow(v, 1.7); }
  HMTEX = [G1080.texR16(hm, N), G720.texR16(hm, N), G540.texR16(hm, N)];
}
const MAIN = document.getElementById('c'), CTX = MAIN.getContext('2d');
const [XF, XFx] = mk2d();
function drawShot(ctx, s, t, f) {
  if (!s._init && s.init) { s.init(); } s._init = true;
  ctx.save(); s.draw(ctx, t - s.a, t, f); ctx.restore();
}
function renderFrame(t) {
  const f = Math.round(t * FPS);
  CTX.setTransform(1, 0, 0, 1, 0, 0); CTX.globalAlpha = 1; CTX.globalCompositeOperation = 'source-over'; CTX.filter = 'none'; CTX.fillStyle = '#000'; CTX.fillRect(0, 0, W, H);
  const i = SHOTS.findIndex(s => t >= s.a - 1e-6 && t < s.b - 1e-6);
  if (i < 0) return f;
  const s = SHOTS[i];
  drawShot(CTX, s, t, f);
  if (s.xin && t - s.a < s.xin && i > 0) { // 交叉溶解：上一个镜头继续演，盖在上面渐隐
    const p = SHOTS[i - 1]; XFx.setTransform(1, 0, 0, 1, 0, 0); XFx.globalAlpha = 1; XFx.fillStyle = '#000'; XFx.fillRect(0, 0, W, H);
    drawShot(XFx, p, t, f); CTX.save(); CTX.globalAlpha = 1 - ease.inout((t - s.a) / s.xin); CTX.drawImage(XF, 0, 0); CTX.restore();
  }
  if (s.bloom) bloom(CTX, typeof s.bloom === 'number' ? s.bloom : 0.5, s.bthr || 0.35);
  post(CTX, f, s.grain == null ? 0.05 : s.grain);
  cornerTag(CTX, s, s.tagA ? s.tagA(t - s.a) : 1);
  return f;
}
window.initFilm = initFilm; window.renderFrame = renderFrame;
// ---- 音乐驱动：MENV 每帧响度，MBEATS 节拍（全局秒） ----
const menv = t => (typeof MENV === 'undefined') ? 0 : (MENV[Math.max(0, Math.min(MENV.length - 1, Math.round(t * FPS)))] || 0);
const mons = t => (typeof MONS === 'undefined') ? 0 : (MONS[Math.max(0, Math.min(MONS.length - 1, Math.round(t * FPS)))] || 0);
function beatIdx(t) { if (typeof MBEATS === 'undefined') return [0, 0]; let lo = 0, hi = MBEATS.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (MBEATS[m] <= t) { k = m; lo = m + 1; } else hi = m - 1; } return [k, k >= 0 ? t - MBEATS[k] : 1e9]; }
