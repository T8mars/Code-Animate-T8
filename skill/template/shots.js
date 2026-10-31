// ===== shots.js —— 镜头时间线骨架（长片用；源自《写出来的影像》的 core.js） =====
// 用法：film.html 里在 scene.js 之前加载本文件（模板已加好）。scene.js 里只写镜头：
//
//   setTimeline({ lines: { 1: [0.9, 2.0], 2: [2.5, 4.2] }, gaps: [[4.2, 9, 'title']] });   // 口播时间表（可选，没有口播就不调用）
//   shot(0, LS(2), { draw(ctx, lt, t, f) { ... } });                                    // lt = 镜头内时间，t = 全片时间，f = 帧号
//   shot(LS(2), GP('title')[1], { xin: .6, bloom: .4, grain: .05, draw(ctx, lt) { ... } });
//   filmOptions({ tags: true });                                                        // 右上角显示「文件名:行号」角标（可选）
//
// 规则：
//   - 镜头按 shot() 调用顺序排列，时间 [a, b)，前后相接；t 落在没有镜头的地方画黑。
//   - xin: 交叉溶解秒数。这个镜头开头 xin 秒内，上一个镜头继续演、盖在上面渐隐。
//   - init(): 第一次用到这个镜头时调一次（预生成贴图、编译着色器）。不要在 init 里放依赖时间的状态。
//   - state: { init(), step(f, lt), snapshot?(), restore?(snap) } —— 有状态的镜头（粒子、数据混合、拖尾）。
//            骨架在 draw 之前自动调用 syncState：从镜头起点按帧号重放到当前帧，所以 snap.js / contact.js 跳着取帧
//            也和顺序渲染完全一样。draw 的第 5 个参数就是这个 state。提供 snapshot/restore 时每 30 帧存一次快照，
//            往回跳时从最近的快照接着算，不用从头重放（见 syncState 的注释）。rq.py 分段渲染时不会把有 state 的镜头切开。
//   - grain（默认 0.05）、bloom（数字 = 强度，bthr = 阈值）是每个镜头自己的后期。
//   - 返回值：shot() 返回镜头对象本身，可以存起来给别的镜头引用（如 s.a、s.b）。
//   - 本文件不定义 MAIN / CTX / G / initFilm / renderFrame 这些名字，旧的 scene.js（自己写 renderFrame 的）照常工作：
//     它在本文件之后加载，会覆盖 window.initFilm / window.renderFrame。
//
// 口播时间表：LN(id) → [开始, 结束]，LS(id) 开始，LE(id) 结束（全片秒）；GP(label, after) → 第一个起点 ≥ after 的同名空档 [a, b, label]。
//   时间表的 id 可以是数字或 'L021' 这类字符串，LS(21) 和 LS('L021') 都能找到。

const SHOTS = [];
const _FILM = { tl: { lines: {}, gaps: [] }, opt: { tags: false, bg: '#000' }, inits: [] };
function setTimeline(tl) { _FILM.tl = { lines: tl.lines || {}, gaps: tl.gaps || [] }; }
function filmOptions(o) { Object.assign(_FILM.opt, o); }
function onInit(fn) { _FILM.inits.push(fn); }          // 额外的异步初始化（加载图片、建 WebGL），initFilm 时按顺序 await
function _lineKey(id) {
  const L = _FILM.tl.lines; if (id in L) return id;
  const n = String(parseInt(String(id).replace(/\D/g, ''), 10));
  for (const k in L) if (String(parseInt(String(k).replace(/\D/g, ''), 10)) === n) return k;
  throw new Error('时间表里没有这句：' + id);
}
const LN = id => _FILM.tl.lines[_lineKey(id)];
const LS = id => LN(id)[0], LE = id => LN(id)[1];
function GP(label, after = 0) { const g = _FILM.tl.gaps.find(g => g[2] === label && g[0] >= after - 1e-3); if (!g) throw new Error('时间表里没有空档：' + label); return g; }

function srcLine() {   // 调用 shot() 的源文件与行号（角标用）
  const st = (new Error().stack || '').split('\n');
  for (const l of st) { const m = l.match(/\/([^\/:]+\.js):(\d+):\d+/); if (m && m[1] !== 'shots.js') return m[1] + ':' + m[2]; }
  return '';
}
function shot(a, b, o = {}) {
  if (!(b > a)) throw new Error(`shot(${a}, ${b})：结束时间必须大于开始时间`);
  const s = Object.assign({ a, b, src: srcLine(), grain: 0.05 }, o); SHOTS.push(s); return s;
}

// ---- 有状态镜头：按帧号重放（带快照缓存） ----
// syncState(s, f)：让 s.state（或旧写法 s.flow）恰好处在第 f 帧之后的状态。
//   顺序渲染时每帧只 step 一次；往回跳（snap/contact 取帧、交叉溶解里重画上一个镜头）时：
//   有 snapshot/restore → 从 ≤f 的最近快照接着算；没有 → 从镜头起点 init() 重放。
//   快照每 every（默认 30）帧存一份，最多 maxSnaps（默认 40）份；快照要自己深拷贝（Float32Array.slice()、
//   离屏画布用 getImageData 或另画一张）。
function syncState(s, f) {
  const st = s.state || s.flow; if (!st) return;
  const f0 = Math.round(s.a * FPS), every = st.every || 30, maxSnaps = st.maxSnaps || 40;
  if (s._f === undefined || f < s._f) {
    let best = null;
    if (st.snapshot && st.restore && s._snaps) for (const k of Object.keys(s._snaps)) { const kf = +k; if (kf <= f && (best === null || kf > best)) best = kf; }
    if (best !== null) { st.restore(s._snaps[best]); s._f = best; }
    else { st.init(); s._f = f0 - 1; if (!s._snaps) s._snaps = {}; }
  }
  while (s._f < f) {
    s._f++; st.step(s._f, s._f / FPS - s.a);
    if (st.snapshot && st.restore && (s._f - f0) % every === every - 1) {
      s._snaps = s._snaps || {}; s._snaps[s._f] = st.snapshot();
      const ks = Object.keys(s._snaps); if (ks.length > maxSnaps) delete s._snaps[ks[0]];
    }
  }
}

// ---- 后期：辉光（缩小 → 模糊 → 叠加），颗粒 + 暗角用 lib.js 的 post() ----
const [_BLm, _BLx] = mk2d(480, 270), [_BLm2, _BLx2] = mk2d(240, 135);
function bloom(ctx, amt = 0.6, thr = 0) {
  _BLx.globalCompositeOperation = 'source-over'; _BLx.filter = 'none'; _BLx.drawImage(ctx.canvas, 0, 0, 480, 270);
  if (thr > 0) { _BLx.globalCompositeOperation = 'multiply'; const v = 255 * (1 - thr); _BLx.fillStyle = `rgb(${v},${v},${v})`; _BLx.fillRect(0, 0, 480, 270); _BLx.globalCompositeOperation = 'source-over'; }
  _BLx2.clearRect(0, 0, 240, 135); _BLx2.filter = 'blur(6px)'; _BLx2.drawImage(_BLm, 0, 0, 240, 135); _BLx2.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = amt; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(_BLm2, 0, 0, W, H); ctx.globalAlpha = amt * 0.6; _BLx.filter = 'blur(3px)'; _BLx.drawImage(_BLm, 0, 0); _BLx.filter = 'none'; ctx.drawImage(_BLm, 0, 0, W, H); ctx.restore();
}
function cornerTag(ctx, s, a = 1) {
  if (!_FILM.opt.tags || !s.src || s.tag === false) return;
  ctx.save(); ctx.globalAlpha = 0.62 * a; ctx.font = `400 30px ${FONT.mono}`; ctx.textAlign = 'right'; ctx.fillStyle = s.tagDark ? '#1b1b1b' : '#e9e4d8';
  ctx.shadowColor = s.tagDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.8)'; ctx.shadowBlur = 8;
  ctx.fillText(s.tag || s.src, W - 64, 76); ctx.restore();
}

// ---- 入口：initFilm / renderFrame 由骨架提供 ----
async function filmInit() {
  await document.fonts.ready;
  for (const f of ['400 40px "JetBrains Mono"', '700 40px "JetBrains Mono"', '600 40px "Space Grotesk"', '500 40px "Cormorant Garamond"', '500 40px "Noto Sans CJK SC"', '400 40px "Noto Serif CJK SC"']) { try { await document.fonts.load(f, '写出来的影像Ag'); } catch (e) { } }
  for (const fn of _FILM.inits) await fn();
  // 镜头表检查：重叠、空洞、顺序（只警告，不中断）
  for (let i = 1; i < SHOTS.length; i++) {
    const p = SHOTS[i - 1], s = SHOTS[i];
    if (s.a < p.b - 1e-6) console.warn(`镜头重叠：${p.src} [${p.a.toFixed(2)}, ${p.b.toFixed(2)}) 和 ${s.src} [${s.a.toFixed(2)}, ${s.b.toFixed(2)})`);
    else if (s.a > p.b + 1e-6) console.warn(`镜头之间有 ${(s.a - p.b).toFixed(2)} 秒空洞（会画黑）：${p.src} → ${s.src}`);
  }
  return SHOTS.length + ' shots';
}
const [_XF, _XFx] = mk2d();
let _FILM_CTX = null;
function _drawShot(ctx, s, t, f) {
  if (!s._init && s.init) s.init(); s._init = true;
  if (s.state || s.flow) syncState(s, f);
  ctx.save(); s.draw(ctx, t - s.a, t, f, s.state || s.flow); ctx.restore();
}
function shotAt(t) { return SHOTS.findIndex(s => t >= s.a - 1e-6 && t < s.b - 1e-6); }
function filmRender(t) {
  if (!_FILM_CTX) _FILM_CTX = document.getElementById('c').getContext('2d');
  const ctx = _FILM_CTX, f = Math.round(t * FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = _FILM.opt.bg; ctx.fillRect(0, 0, W, H);
  const i = shotAt(t);
  if (i < 0) return f;
  const s = SHOTS[i];
  _drawShot(ctx, s, t, f);
  if (s.xin && t - s.a < s.xin && i > 0) {           // 交叉溶解：上一个镜头继续演（时间照走），盖在上面渐隐
    const p = SHOTS[i - 1]; _XFx.setTransform(1, 0, 0, 1, 0, 0); _XFx.globalAlpha = 1; _XFx.fillStyle = _FILM.opt.bg; _XFx.fillRect(0, 0, W, H);
    _drawShot(_XFx, p, t, f); ctx.save(); ctx.globalAlpha = 1 - ease.inout((t - s.a) / s.xin); ctx.drawImage(_XF, 0, 0); ctx.restore();
  }
  if (s.bloom) bloom(ctx, typeof s.bloom === 'number' ? s.bloom : 0.5, s.bthr == null ? 0.35 : s.bthr);
  if (s.grain) post(ctx, f, s.grain);
  cornerTag(ctx, s, s.tagA ? s.tagA(t - s.a) : 1);
  return f;
}
// 给 rq.py 用：镜头列表（solid = 有状态，分段渲染时不要从中间切开）
function shotList() { return SHOTS.map(s => ({ a: s.a, b: s.b, src: s.src, solid: !!(s.state || s.flow || s.solid), xin: s.xin || 0 })); }
window.initFilm = filmInit; window.renderFrame = filmRender; window.shotList = shotList;
