// ===== 基础设施：画布、缓动、噪声、WebGL =====
const W = 1920, H = 1080, FPS = 30;
const C = {
  ink: '#070A12', ink2: '#0C1220', gold: '#F2C46D', cream: '#EDE6D6', cyan: '#6FD3FF', mag: '#FF5FA2', dim: 'rgba(237,230,214,0.55)'
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = {
  out: t => 1 - Math.pow(1 - clamp(t), 3),
  inout: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  in: t => Math.pow(clamp(t), 3),
  expo: t => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
};
// 确定性随机
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---- Ken Perlin 改进版噪声（2002 参考实现的 JS 版）----
const PERM = (() => { const r = mulberry(1982), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1));[p[i], p[j]] = [p[j], p[i]]; } const out = new Uint8Array(512); for (let i = 0; i < 512; i++) out[i] = p[i & 255]; return out; })();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(x, y, z) {
  let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
  const u = fade(x), v = fade(y), w = fade(z), P = PERM;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}
// 周期性 2D 梯度噪声（地形高度图用，可无缝平铺）
function pnoise2(x, y, per) {
  const X0 = Math.floor(x), Y0 = Math.floor(y), fx = x - X0, fy = y - Y0;
  const g = (ix, iy) => { ix = ((ix % per) + per) % per; iy = ((iy % per) + per) % per; const h = PERM[(PERM[ix & 255] + iy) & 511] + ((ix >> 8) * 31 + (iy >> 8) * 17); const a = h * 2.399963; return [Math.cos(a), Math.sin(a)]; };
  const d = (ix, iy) => { const gg = g(ix, iy); return gg[0] * (x - ix) + gg[1] * (y - iy); };
  const u = fade(fx), v = fade(fy);
  return lerp(lerp(d(X0, Y0), d(X0 + 1, Y0), u), lerp(d(X0, Y0 + 1), d(X0 + 1, Y0 + 1), u), v);
}

// ---- WebGL ----
const GLSL_HEAD = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T; uniform float P; uniform float Q; uniform float S;
uniform sampler2D HM; uniform sampler2D TX2;
out vec4 O;
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.+2.*fract(sin(p)*43758.5453123);}
float hash1(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float gnoise(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
            mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p,float oct){float s=0.,a=.5;for(int i=0;i<8;i++){float fi=float(i); if(fi>=oct)break; float w=clamp(oct-fi,0.,1.); s+=w*a*gnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
`;
function makeGL(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  const vs = `#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const progs = {};
  function sh(t, s) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) + '\n' + s.split('\n').map((l, i) => (i + 1) + ': ' + l).slice(0, 400).join('\n')); return x; }
  return {
    cv, gl,
    add(name, body) { const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GLSL_HEAD + body)); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); progs[name] = pr; },
    run(name, u = {}) {
      const pr = progs[name]; gl.useProgram(pr); gl.viewport(0, 0, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(pr, 'R'), w, h);
      for (const k of ['T', 'P', 'Q', 'S']) gl.uniform1f(gl.getUniformLocation(pr, k), u[k] || 0);
      if (u.U) for (const k in u.U) { const v = u.U[k], l = gl.getUniformLocation(pr, k); if (l == null) continue; if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); }
      if (u.tex2) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, u.tex2); gl.uniform1i(gl.getUniformLocation(pr, 'TX2'), 1); }
      if (u.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, u.tex); gl.uniform1i(gl.getUniformLocation(pr, 'HM'), 0); }
      gl.drawArrays(gl.TRIANGLES, 0, 3); return cv;
    },
    texRGBA16(data, n) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, n, n, 0, gl.RGBA, gl.FLOAT, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); return t; },
    texImg(cv, rep) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); const w = rep ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w); return t; },
    texR16(data, n) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, n, n, 0, gl.RED, gl.FLOAT, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); return t; }
  };
}

// ---- 2D 工具 ----
function mk2d(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const FONT = { serif: '"Noto Serif CJK SC","Noto Serif SC",serif', disp: '"Cormorant Garamond",serif', mono: '"JetBrains Mono","Noto Sans Mono CJK SC",monospace', grot: '"Space Grotesk","Noto Sans CJK SC",sans-serif', sans: '"Noto Sans CJK SC",sans-serif' };
function txt(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.font = `${o.w || 400} ${o.size || 40}px ${o.font || FONT.serif}`; ctx.fillStyle = o.color || C.cream; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha); if (o.ls) ctx.letterSpacing = o.ls + 'px';
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur || 20; }
  ctx.fillText(s, x, y); const m = ctx.measureText(s).width; ctx.restore(); return m;
}
// 逐字浮现的字幕：lines=[...], 时间 lt 相对字幕起点, dur=持续
function caption(ctx, lines, lt, dur, o = {}) {
  if (lt < 0 || lt > dur) return;
  const x = o.x == null ? 140 : o.x, y0 = o.y == null ? 900 : o.y, size = o.size || 46, lh = size * 1.55;
  const outA = 1 - sstep(dur - 0.45, dur, lt);
  ctx.save();
  if (o.scrim !== false) { const g = ctx.createLinearGradient(0, y0 - lh * lines.length - 80, 0, H); g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, `rgba(5,7,12,${0.62 * outA})`); ctx.fillStyle = g; ctx.fillRect(0, y0 - lh * lines.length - 80, W, H); }
  let k = 0;
  lines.forEach((line, li) => {
    const y = y0 - (lines.length - 1 - li) * lh; let cx = x;
    if (o.align === 'center') { ctx.font = `${o.w || 500} ${size}px ${FONT.serif}`; cx = W / 2 - ctx.measureText(line).width / 2; }
    for (const ch of line) {
      const a = sstep(k * 0.028, k * 0.028 + 0.35, lt) * outA; k++;
      ctx.font = `${o.w || 500} ${size}px ${FONT.serif}`; ctx.fillStyle = o.color || C.cream; ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18;
      ctx.fillText(ch, cx, y + (1 - a) * 10); cx += ctx.measureText(ch).width;
    }
  });
  ctx.restore();
}
// 胶片颗粒 + 暗角（全片统一后期）
const GRAIN = (() => { const arr = []; const r = mulberry(7); for (let k = 0; k < 6; k++) { const [c, x] = mk2d(480, 270); const im = x.createImageData(480, 270); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); arr.push(c); } return arr; })();
function post(ctx, f, amt = 0.055) {
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amt; ctx.imageSmoothingEnabled = false; ctx.drawImage(GRAIN[f % 6], 0, 0, W, H); ctx.restore();
  ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// "史实 / 传说" 印章
function stamp(ctx, label, sub, x, y, a, rot = -0.08) {
  if (a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const s = 1 + (1 - ease.out(a)) * 0.6; ctx.scale(s, s); ctx.globalAlpha = clamp(a * 1.4);
  ctx.strokeStyle = '#E2533B'; ctx.lineWidth = 5; ctx.strokeRect(-92, -46, 184, 92); ctx.lineWidth = 1.5; ctx.strokeRect(-84, -38, 168, 76);
  txt(ctx, label, 0, 16, { size: 50, w: 900, color: '#E2533B', align: 'center', font: FONT.serif, ls: 10 });
  if (sub) { ctx.font = `500 32px ${FONT.sans}`; const sw = ctx.measureText(sub).width + 28; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-sw / 2, 60, sw, 44); txt(ctx, sub, 0, 93, { size: 32, color: 'rgba(245,240,230,0.95)', align: 'center', font: FONT.sans }); }
  ctx.restore();
}

// ---- 运动节奏工具（成片里踩过的坑：诡盘每秒跳 8 下，30fps 下变成 4/4/4/3 帧交替，看起来一卡一卡） ----
// stepAt(t, fps, stepsPerSec)：离散步进动画（定格、诡盘、手翻书、像素角色）的「第几格」。
//   - 每秒步数必须是 fps 的整数约数（30fps → 30/15/10/6/5/3/2/1），这样每一格停留的帧数完全相同，节奏才均匀。
//   - 不是约数时就近取一个约数并 console.warn 一次（例：8 → 10，即每格 3 帧）。
//   - 用帧号做整数运算，不受 t 的浮点误差影响（0.1+0.2 这类误差会让某一格提前/推迟一帧）。
//   返回整数格号（从 0 开始，t<0 时为负数）。典型用法：ang = stepAt(lt, FPS, 30) * Math.PI / 6（每帧转一格）。
const _stepWarned = {};
function stepAt(t, fps = FPS, stepsPerSec = fps) {
  const divs = []; for (let d = 1; d <= fps; d++) if (fps % d === 0) divs.push(d);
  let sps = stepsPerSec;
  if (!divs.includes(sps)) {
    sps = divs.reduce((best, d) => Math.abs(d - stepsPerSec) <= Math.abs(best - stepsPerSec) ? d : best, divs[0]); // 距离相同取较大的（更顺）
    const key = fps + ':' + stepsPerSec;
    if (!_stepWarned[key]) { _stepWarned[key] = 1; console.warn(`stepAt: 每秒 ${stepsPerSec} 步不是 ${fps}fps 的整数约数，节奏会不均匀；已改为每秒 ${sps} 步（每格 ${fps / sps} 帧）`); }
  }
  const f = Math.round(t * fps);                 // 当前帧号（整数）
  return Math.floor(f / (fps / sps));            // 每格停留 fps/sps 帧；负帧号也向下取整
}

// motionBlur(drawFn, t, n, shutter, o)：把一帧拆成 n 个子帧分别画，再平均成一张（运动模糊）。
//   用于快速旋转 / 快速移动的物体：每帧位移超过物体自身尺寸的一半时，不加模糊会看到「频闪 / 倒转 / 断成几个」。
//   - drawFn(ctx, tt)：在给定 ctx 上画出第 tt 秒的画面。ctx 已重置为单位变换、全透明。
//   - 子帧时间均匀分布在 [t, t + shutter/FPS) 内（取每段的中点）。shutter=0.5 相当于 180° 快门（电影常用）；1 = 360°。
//   - n：子帧数。旋转越快需要越多（经验：每个子帧之间位移 ≤ 物体宽度的 1/4；8 够大多数情况，诡盘高速段用 12–16）。
//   - 返回一张离屏画布（默认 W×H，可用 o.w / o.h 指定较小尺寸以提速），自己 drawImage 到主画布；给了 o.ctx 就直接画上去
//     （画到 o.ctx 的 0,0，尺寸 o.dw×o.dh，默认 W×H）。drawFn 没画到的地方是透明的，不会盖住主画布原有内容。
//   实现：每个子帧画在离屏画布上，再以 globalAlpha=1/n、'lighter'（相加）合成到累加画布：n 个子帧的预乘颜色相加 = 等权平均，
//         不透明画面、透明叠层（只画物体、背景透明）都正确。
//         实测（软件渲染 1920×1080，转盘）：n=8 约 40ms、n=16 约 90ms；对比 getImageData 浮点逐像素平均 190ms / 390ms，
//         平均误差 0.02 级、最大 2–4 级（8 位量化），肉眼看不出。另一种「滚动平均」（source-over，第 k 个子帧权重 1/(k+1)）同样快，
//         但量化误差会累积（最大 5–9 级），所以不用。物体只占画面一小块时用 o.w/o.h 开小画布、自己 drawImage 到位置上，能再快几倍。
//   注意：drawFn 必须是确定性的（同一 tt 同一画面），且不能读主画布（子帧画在离屏上）。
const _mbCache = {};
function motionBlur(drawFn, t, n = 8, shutter = 0.5, o = {}) {
  const w = o.w || W, h = o.h || H, key = w + 'x' + h;
  if (!_mbCache[key]) _mbCache[key] = { acc: mk2d(w, h), sub: mk2d(w, h) };
  const [accC, acc] = _mbCache[key].acc, [subC, sub] = _mbCache[key].sub;
  acc.setTransform(1, 0, 0, 1, 0, 0); acc.globalAlpha = 1; acc.globalCompositeOperation = 'source-over'; acc.clearRect(0, 0, w, h);
  n = Math.max(1, Math.round(n));
  for (let k = 0; k < n; k++) {
    const tt = t + shutter / FPS * (k + 0.5) / n;
    sub.setTransform(1, 0, 0, 1, 0, 0); sub.globalAlpha = 1; sub.globalCompositeOperation = 'source-over'; sub.filter = 'none'; sub.clearRect(0, 0, w, h);
    sub.save(); drawFn(sub, tt); sub.restore();
    acc.globalCompositeOperation = 'lighter'; acc.globalAlpha = 1 / n;
    acc.drawImage(subC, 0, 0);
  }
  acc.globalAlpha = 1; acc.globalCompositeOperation = 'source-over';
  if (o.ctx) o.ctx.drawImage(accC, 0, 0, o.dw || W, o.dh || H);
  return accC;
}

// ---- 相机 / 参数平滑（成片里文字之城上下抖：相机高度每帧按「脚下地形最高点」算，帧间跳变） ----
// smoothTrack(fn, t0, t1, o)：把一条逐帧算会跳的参数曲线 fn(t)，预先采样、取滑动最大值、再多遍平滑，返回一个平滑的 t → 值 函数。
//   o.dt      采样间隔（秒，默认 0.1）
//   o.maxWin  滑动最大值的窗口总宽（秒，默认 0 = 不取最大值）。用于「离地间隙」「避开障碍」这类只能高不能低的量：
//             先取窗口内最大值形成平台，再平滑，平滑后的曲线才（几乎）不会低于原值。经验：maxWin ≥ 2 × win × √passes；
//             实测（带台阶的地形最高点）：maxWin=3, win=1, passes=4 时最多低 0.07；maxWin=1.2, win=.4 时最多低 2.7；不取最大值时低 40+。
//             所以「离地间隙」类的量另外再加一点余量（文字之城用 +4）。
//   o.win     平滑（滑动平均）的半窗口（秒，默认 1.0）
//   o.passes  平滑遍数（默认 3；3–4 遍滑动平均 ≈ 高斯平滑，曲线二阶连续，镜头不会有「顿挫」）
//   懒计算：第一次调用时才采样（fn 可以依赖 initFilm 里才准备好的数据，如高度图）。返回的函数有 .samples 方便画调试曲线。
//   确定性：只依赖 fn 和参数，同一 t 永远同一值；分段渲染、跳帧截图都一致。
// 例：相机离地高度（文字之城的修法）
//   const camClear = smoothTrack(t => { const p = camPath(t); let g = 0;
//       for (let i = -3; i <= 3; i++) for (let j = -2; j <= 8; j++) g = Math.max(g, terrainH(p.x + i * 3, p.z + j * 3));   // 机位前后左右一片的最高点
//       return g + 4.0; }, 0, 82, { dt: 0.1, maxWin: 3, win: 1, passes: 4 });
//   在 renderFrame 里：cam.y = Math.max(cam.y, camClear(lt));   // 不要再每帧直接用 terrainH 的最大值
function smoothTrack(fn, t0, t1, o = {}) {
  const dt = o.dt || 0.1, maxWin = o.maxWin || 0, win = o.win == null ? 1.0 : o.win, passes = o.passes == null ? 3 : o.passes;
  let S = null;
  const build = () => {
    const N = Math.max(2, Math.ceil((t1 - t0) / dt) + 1); let a = new Float64Array(N);
    for (let k = 0; k < N; k++) a[k] = fn(Math.min(t1, t0 + k * dt));
    if (maxWin > 0) { const h = Math.max(1, Math.round(maxWin / 2 / dt)), b = new Float64Array(N); for (let k = 0; k < N; k++) { let m = -Infinity; for (let q = Math.max(0, k - h); q <= Math.min(N - 1, k + h); q++) m = Math.max(m, a[q]); b[k] = m; } a = b; }
    const h = Math.round(win / dt);
    for (let p = 0; p < passes && h > 0; p++) { const b = new Float64Array(N); for (let k = 0; k < N; k++) { let s = 0, n = 0; for (let q = Math.max(0, k - h); q <= Math.min(N - 1, k + h); q++) { s += a[q]; n++; } b[k] = s / n; } a = b; }
    S = a; f.samples = a;
  };
  const f = t => { if (!S) build(); const x = clamp((t - t0) / dt, 0, S.length - 1), i = Math.floor(x), u = x - i; return lerp(S[i], S[Math.min(i + 1, S.length - 1)], u); };
  return f;
}

// ---- 布局：按实际绘制范围居中（成片里鹈鹕没在画板正中：位置是全局常量，换了布局没跟着改） ----
// measureDraw(drawFn, probe)：在离屏上画一次，扫出不透明像素的包围盒 {x0,y0,x1,y1,w,h,cx,cy}（drawFn 自己的坐标系）。
//   drawFn(ctx) 以原点为参考画（离屏画布中心 = 原点，范围 ±probe/2，默认 ±1024）。一次约 30–60ms，结果按 key 缓存。
// centerIn(ctx, drawFn, box, o)：把 drawFn 画的东西居中放进 box=[x,y,w,h]。
//   o.fit = true：等比缩放到能放下（o.pad 留白比例，默认 0.08）；false（默认）：不缩放，只平移居中。
//   o.key：缓存包围盒的键（形状不变就给一个，否则每次都量）。o.bbox：直接给包围盒（比如 pelican() 的返回值），不量。
//   o.align：'center'（默认）或 'bottom'（底边贴住 box 底，适合站在地面上的角色）。
//   返回实际用的 {s, dx, dy, bbox}。
// 例：centerIn(ctx, c => pelican(c, 0, 0, 1, { ph }), [960, 140, 840, 700], { fit: true, key: 'pel' });
const _bboxCache = {};
function measureDraw(drawFn, probe = 2048, key) {
  if (key && _bboxCache[key]) return _bboxCache[key];
  const [c, x] = mk2d(probe, probe); x.translate(probe / 2, probe / 2); drawFn(x);
  const d = x.getImageData(0, 0, probe, probe).data; let x0 = probe, y0 = probe, x1 = -1, y1 = -1;
  for (let yy = 0; yy < probe; yy += 2) for (let xx = 0; xx < probe; xx += 2) if (d[(yy * probe + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  if (x1 < 0) return null;
  if (x0 === 0 || y0 === 0 || x1 >= probe - 2 || y1 >= probe - 2) console.warn('measureDraw：图形碰到探测画布边缘，包围盒不完整，调大 probe');
  const b = { x0: x0 - probe / 2, y0: y0 - probe / 2, x1: x1 + 2 - probe / 2, y1: y1 + 2 - probe / 2 }; b.w = b.x1 - b.x0; b.h = b.y1 - b.y0; b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2;
  if (key) _bboxCache[key] = b; return b;
}
function centerIn(ctx, drawFn, box, o = {}) {
  const b = o.bbox || measureDraw(drawFn, o.probe, o.key); if (!b) return null;
  const [bx, by, bw, bh] = box, pad = o.pad == null ? 0.08 : o.pad;
  const s = o.fit ? Math.min(bw * (1 - pad) / b.w, bh * (1 - pad) / b.h) : 1;
  const tx = bx + bw / 2, ty = o.align === 'bottom' ? by + bh * (1 - pad / 2) - b.h * s / 2 : by + bh / 2;
  ctx.save(); ctx.translate(tx, ty); ctx.scale(s, s); ctx.translate(-b.cx, -b.cy); drawFn(ctx); ctx.restore();
  return { s, dx: tx - b.cx * s, dy: ty - b.cy * s, bbox: b };
}

// ---- 屏幕像素线宽（成片里小鸟翅膀「断了」：lineWidth .1 再整体 scale，成片尺寸下不到 1 像素） ----
// screenScale(ctx)：当前变换的缩放（√|det|）。screenLW(ctx, px)：把线宽设成屏幕上 px 像素，不随 scale 变。
// minLW(ctx, lw, px = 1.5)：线宽取 lw 和「屏幕 px 像素」中较大的一个。剪影的主体一律用填充，描边只做细节，并且至少 1.5px。
function screenScale(ctx) { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }
function screenLW(ctx, px) { ctx.lineWidth = px / screenScale(ctx); return ctx.lineWidth; }
function minLW(ctx, lw, px = 1.5) { ctx.lineWidth = Math.max(lw, px / screenScale(ctx)); return ctx.lineWidth; }
