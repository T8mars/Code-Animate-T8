// ===== 第三幕 地下时代（1980s–2013） =====
(() => {
const A3 = SEG('a3');
// ---- 像素字：小画布上写，再不插值放大 ----
const [PX, PXx] = mk2d(640, 24);
function pixText(ctx, s, x, y, scale, col, o = {}) {
  PXx.clearRect(0, 0, 640, 24); PXx.font = `700 ${o.h || 16}px ${FONT.mono}`; PXx.fillStyle = col; PXx.textBaseline = 'top'; PXx.fillText(s, 0, 2);
  const w = Math.min(640, PXx.measureText(s).width + 2);
  ctx.save(); ctx.imageSmoothingEnabled = false; if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const dx = o.center ? x - w * scale / 2 : x; ctx.drawImage(PX, 0, 0, w, 24, dx, y, w * scale, 24 * scale); ctx.restore(); return w * scale;
}
function sineScroll(ctx, s, t, y, scale, speed, amp, colFn) {
  const cw = 10 * scale; const off = t * speed;
  for (let i = 0; i < s.length; i++) {
    const x = W + 40 - off + i * cw; if (x < -cw || x > W + cw) continue;
    const yy = y + Math.sin(x * 0.006 + t * 3) * amp;
    pixText(ctx, s[i], x, yy, scale, colFn(i, x));
  }
}
function copperBars(ctx, t, n = 7, alpha = 1) {
  for (let k = 0; k < n; k++) {
    const y = H / 2 + Math.sin(t * 1.8 + k * .45) * 360; const hue = (k * 50 + t * 40) % 360;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30); g.addColorStop(0, `hsla(${hue},90%,30%,0)`); g.addColorStop(.5, `hsla(${hue},95%,65%,${alpha})`); g.addColorStop(1, `hsla(${hue},90%,30%,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, y - 30, W, 60);
  }
}
function starfield(ctx, t, n = 260) {
  for (let i = 0; i < n; i++) { const r = mulberry(i + 77); const z = ((r() * 1000 - t * 260) % 1000 + 1000) % 1000 + 1; const x = W / 2 + (r() - .5) * 4000 / z * 100, y = H / 2 + (r() - .5) * 2400 / z * 100; const s = Math.max(1, 6 - z / 200);
    ctx.fillStyle = `rgba(255,255,255,${clamp(1.2 - z / 1000)})`; ctx.fillRect(x, y, s, s); }
}
// ---------- 幕卡 ----------
shot(A3[1], A3[1] + 3, {
  tag: false, grain: .03,
  draw(ctx, lt) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); starfield(ctx, lt); copperBars(ctx, lt, 5, .55);
    const a = sstep(.1, .5, lt) * (1 - sstep(2.5, 3, lt));
    pixText(ctx, 'ACT III', W / 2, 330, 5, '#7dff6a', { center: true, alpha: a, h: 14 });
    txt(ctx, '地下时代', W / 2, 600, { size: 150, w: 900, align: 'center', color: '#fff', alpha: a, ls: 24, shadow: 'rgba(255,60,200,.7)', blur: 30 });
    pixText(ctx, '1980s - 2013', W / 2, 680, 4, '#2ec4ff', { center: true, alpha: a });
  }
});
// ---------- 藏在开头的签名 ----------
const GREET = '    WRITTEN BY CODE 2026 ... GREETINGS TO PLATEAU * MELIES * KANDINSKY * LEN LYE * WHITNEY * PERLIN * QUILEZ * MURATA ... NO CAMERA, NO VIDEO MODEL, JUST CODE ...   ';
shot(A3[1] + 3, GP('demo')[0], {
  grain: .03, xin: .3,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); starfield(ctx, lt);
    copperBars(ctx, lt, 7, .8);
    // logo
    const lg = 'WRITTEN'; const sx = W / 2 - lg.length * 60;
    for (let i = 0; i < lg.length; i++) { const hue = (i * 40 + lt * 90) % 360; pixText(ctx, lg[i], sx + i * 120, 120 + Math.sin(lt * 3 + i * .6) * 30, 9, `hsl(${hue},95%,62%)`); }
    const her = t > LS(46) ? '    *** INTANGIBLE HERITAGE ***  FINLAND 2020 * GERMANY 2021 * POLAND 2021 * ... ' : GREET;
    sineScroll(ctx, her, t > LS(46) ? t - LS(46) : lt, 760, 7, 520, 70, (i, x) => `hsl(${(x * .2 + lt * 120) % 360},95%,65%)`);
    // 字节数比赛
    const l45 = t - LS(45);
    if (l45 > 0 && t < LS(46)) {
      const bytes = l45 < 3.5 ? 65536 : 4096; const a = sstep(0, .4, l45);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(1240, 330, 600, 300); ctx.strokeStyle = '#7dff6a'; ctx.lineWidth = 3; ctx.strokeRect(1240, 330, 600, 300); ctx.restore();
      pixText(ctx, bytes === 65536 ? '64 KB' : ' 4 KB', 1290, 360, 7, '#7dff6a', { alpha: a });
      pixText(ctx, `${Math.min(bytes, Math.floor(((l45 % 3.5) / 3.2) * bytes)).toString().padStart(5, '0')} / ${bytes}`, 1290, 500, 3.2, '#e8ffe0', { alpha: a });
      const p = clamp((l45 % 3.5) / 3.2); ctx.fillStyle = '#7dff6a'; ctx.fillRect(1290, 580, 500 * p, 14);
    }
    const l46 = t - LS(46); stamp(ctx, '史实', '芬兰 2020 年起', 1600, 470, sstep(.5, .9, l46) * (1 - sstep(5.6, 6.2, l46)));
    eraTag(ctx, '1980s', '破解组的签名动画', sstep(.3, .9, lt) * (1 - sstep(6, 7, lt)));
  }
});
// ---------- 本片自己的演示场景小片（字节数是真的） ----------
const DEMO = { t0: GP('demo')[0], t1: GP('demo')[1] };
shot(DEMO.t0, DEMO.t1, {
  grain: .02, bloom: .35, bthr: .4, xin: .3,
  draw(ctx, lt, t) {
    const seg = Math.min(3, Math.floor(lt / 9)); const [bi, since] = beatIdx(t); const pulse = Math.exp(-since * 7);
    const im = G720.run('demo', { T: lt + seg * 3, P: seg, S: pulse });
    ctx.drawImage(im, 0, 0, W, H);
    if (lt % 9 < .08) flash(ctx, .6);
    // 滚动字幕压在底部上方
    sineScroll(ctx, '   THIS DEMO IS PART OF THE FILM ... ' + SH.demo.length + ' BYTES OF SHADER ... SAY HI TO THE SCENE ...   ', lt, 650, 6, 480, 40, (i, x) => `hsl(${(x * .3 + lt * 160) % 360},100%,70%)`);
    const b = SH.demo.length;
    pixText(ctx, `${b.toLocaleString()} BYTES`, 70, 70, 4, '#7dff6a');
    txt(ctx, '这一镜的着色器，真实字节数', 72, 190, { size: 36, color: '#e8ffe0', alpha: sstep(1, 1.6, lt) * (1 - sstep(8, 9, lt)), shadow: 'rgba(0,0,0,.8)' });
  }
});
// ---------- Elevated：4096 个格子长出一座雪山 ----------
const MT = { N: 48 };
function mtnH(i, j) { const x = i / MT.N, z = j / MT.N; let h = 0, a = 1, f = 2.2; for (let o = 0; o < 5; o++) { h += a * (1 - Math.abs(noise3(x * f + 3.1, z * f + 1.7, o * 7.3))); a *= .5; f *= 2.05; } return Math.pow(h / 1.9, 2.2) * 1.4 * Math.exp(-((x - .5) ** 2 + (z - .55) ** 2) * 3); }
let MTH = null;
const L48KB = 420; // 这句话的录音（48 kHz 16 bit WAV）≈ 4.37 s × 96 KB/s
shot(LS(47) - 0.6, LS(51) - 0.3, {
  grain: .04, bloom: .3, bthr: .4, xin: .5,
  init() { MTH = []; for (let j = 0; j <= MT.N; j++) { MTH[j] = []; for (let i = 0; i <= MT.N; i++) MTH[j][i] = mtnH(i, j); } },
  draw(ctx, lt, t) {
    ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, W, H);
    const solid = sstep(LS(49) + 1.5, LS(49) + 3.0, t) * (1 - sstep(LS(50) + 1.5, LS(50) + 3, t)) + sstep(LS(50) + 4.5, LS(50) + 5.5, t);
    // 4096 格方阵（64×64）
    const gx = 140, gy = 150, cs = 11.5; const grow = clamp((t - LS(47)) / 6.5);
    const filled = Math.floor(grow * 4096);
    ctx.save(); ctx.globalAlpha = 1 - solid * .85;
    for (let k = 0; k < 4096; k++) { const i = k % 64, j = Math.floor(k / 64); ctx.fillStyle = k < filled ? 'rgba(111,211,255,.28)' : 'rgba(111,211,255,.07)'; ctx.fillRect(gx + i * cs, gy + j * cs, cs - 2, cs - 2); }
    ctx.restore();
    txt(ctx, '4,096 个格子 = 整个程序的 4,096 字节（示意）', gx, gy + 64 * cs + 60, { size: 36, font: FONT.mono, color: '#9fe6ff', alpha: (1 - solid) * sstep(.4, 1, lt) });
    // 线框雪山：按格子数一笔笔长出来
    const cx = gx + 32 * cs + 60, cy = gy + 40 * cs, yaw = lt * .12 + .6;
    const pr = (i, j, h) => { const x = (i / MT.N - .5), z = (j / MT.N - .5); const X = x * Math.cos(yaw) - z * Math.sin(yaw), Z = x * Math.sin(yaw) + z * Math.cos(yaw); const d = 2.2 + Z; return [cx + X * 1400 / d, cy - (h * .55 - .05) * 1400 / d + Z * 180]; };
    const nLines = Math.floor(grow * (MT.N + 1) * 2);
    if (solid > 0) { // 成品：平面着色的雪山
      const quads = [];
      for (let j = 0; j < MT.N; j++) for (let i = 0; i < MT.N; i++) { const z = ((i / MT.N - .5) * Math.sin(yaw) + (j / MT.N - .5) * Math.cos(yaw)); quads.push([z, i, j]); }
      quads.sort((a, b) => b[0] - a[0]);
      ctx.save(); ctx.globalAlpha = solid;
      for (const [, i, j] of quads) { const h = [MTH[j][i], MTH[j][i + 1], MTH[j + 1][i + 1], MTH[j + 1][i]]; const nx = (h[0] - h[1]) * MT.N, nz = (h[0] - h[3]) * MT.N; const sh = clamp(.55 + .25 * nx - .2 * nz);
        const hm = (h[0] + h[2]) / 2; const snow = hm > .35; const c = snow ? [235 * sh + 20, 240 * sh + 15, 255 * sh] : [60 * sh + 20, 75 * sh + 25, 110 * sh + 30];
        ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.beginPath(); const p = [pr(i, j, h[0]), pr(i + 1, j, h[1]), pr(i + 1, j + 1, h[2]), pr(i, j + 1, h[3])]; p.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = 1 - solid; ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1.4;
    for (let L = 0; L < nLines; L++) { const dir = L % 2, k = L >> 1; ctx.beginPath(); for (let m = 0; m <= MT.N; m++) { const i = dir ? m : k, j = dir ? k : m; if (i > MT.N || j > MT.N) continue; const p = pr(i, j, MTH[j][i]); m ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
    ctx.restore();
    // 文件大小对比
    const l48 = t - LS(48);
    if (l48 > 0 && t < LS(49) + 1.5) { const a = sstep(0, .5, l48) * (1 - sstep(LS(49) + 1, LS(49) + 1.5, t)); const bx = 1180, by = 300;
      txt(ctx, '这句话的录音（WAV）', bx, by, { size: 40, color: C.cream, alpha: a });
      ctx.fillStyle = `rgba(255,143,184,${a})`; ctx.fillRect(bx, by + 30, 640 * ease.out(l48 / 1.2), 46); txt(ctx, `${L48KB} KB`, bx + 10, by + 130, { size: 44, font: FONT.mono, color: '#FF8FB8', alpha: a });
      txt(ctx, '《Elevated》整部作品', bx, by + 240, { size: 40, color: C.cream, alpha: a });
      ctx.fillStyle = `rgba(111,211,255,${a})`; ctx.fillRect(bx, by + 270, 640 * 4 / L48KB, 46); txt(ctx, '4 KB', bx + 30, by + 370, { size: 44, font: FONT.mono, color: '#9fe6ff', alpha: a }); }
    eraTag(ctx, '2009', 'Breakpoint 大会 4K 组第一名', sstep(.3, .9, lt) * (1 - sstep(6, 7, lt)));
    const l49 = t - LS(49); stamp(ctx, '史实', null, 1640, 360, sstep(.4, .8, l49) * (1 - sstep(5, 5.6, l49)));
    if (l49 > 0) { txt(ctx, 'Iñigo Quílez', 1240, 640, { size: 72, font: FONT.disp, w: 600, color: '#fff', alpha: sstep(.3, .9, l49) * (1 - sstep(9, 10, l49)) }); txt(ctx, '伊尼戈·奎莱斯', 1244, 710, { size: 44, color: C.cream, alpha: sstep(.5, 1.1, l49) * (1 - sstep(9, 10, l49)) }); }
  }
});
// ---------- Shadertoy：只用一段数学画整个画面 ----------
shot(LS(51) - 0.3, LS(53) - 0.2, {
  grain: .03, xin: .5,
  draw(ctx, lt, t) {
    const split = t < LS(52) + .5 ? 0 : ease.inout((t - LS(52) - .5) / 1.2) * .5;
    const im = G720.run('sdf', { T: lt + 1, P: ease.inout(lt / 7), S: split });
    ctx.drawImage(im, 0, 0, W, H);
    eraTag(ctx, '2013', 'Shadertoy', sstep(.2, .8, lt) * (1 - sstep(5, 6, lt)), true);
    if (split > .1) { txt(ctx, '光线步进的步数', W * split - 30, 140, { size: 38, align: 'right', color: '#fff', alpha: sstep(.1, .3, split), shadow: 'rgba(0,0,0,.6)' }); txt(ctx, '成品', W * split + 30, 140, { size: 38, color: '#222', alpha: sstep(.1, .3, split) }); }
    codeBox(ctx, ['d = smin(sphere, sphere2, k);', 'd = smin(d, torus, k);', 'd = smin(d, ground, k);'], 1180, 760, (lt - 1) * 1.3, { size: 30, rate: 30, alpha: sstep(1, 1.5, lt) });
  }
});
// ---------- 闪回：第二幕的山脉，线框揭开 ----------
shot(LS(53) - 0.2, GP('fractal')[0], {
  grain: .04, xin: .4,
  init() { A2X.needOct(); },
  draw(ctx, lt) {
    const O = A2X.oct();
    const im = G720.run('field3d', { Q: 7, tex: O.t1, tex2: O.t2, U: { PIT: -.5, ALT: 14, AMP: 7, MODE: 4, REV: 1e4, CZ: 78 + lt * 2.2, YAW: 0, LIT: 1, WIRE: sstep(.6, 1.6, lt) } });
    ctx.drawImage(im, 0, 0, W, H);
    txt(ctx, '第二幕 · 噪声山脉', 72, 120, { size: 44, color: '#fff', alpha: sstep(0, .4, lt), shadow: 'rgba(0,0,0,.8)' });
  }
});
// ---------- 三维分形：有目的地往深处找出口 ----------
const FR = { t0: GP('fractal')[0], t1: GP('fractal')[1] };
const FR_LINES = SH.fractal.trim().split('\n').length;
shot(FR.t0, FR.t1 + 0.0, {
  grain: .04, bloom: .4, bthr: .35, xin: .5,
  draw(ctx, lt) {
    const bad = sstep(26, 27.5, lt);
    const im = G720.run('fractal', { T: lt * .9 + 3, P: Math.sin(lt * .21) * .6, Q: bad });
    const z = 1 + sstep(27.5, 30, lt) * 1.8;
    ctx.save(); ctx.translate(W / 2, H * .48); ctx.scale(z, z); ctx.translate(-W / 2, -H * .48); ctx.drawImage(im, 0, 0, W, H); ctx.restore();
    txt(ctx, `这一镜：一个函数，${FR_LINES} 行`, 72, 120, { size: 40, font: FONT.sans, color: '#fff', alpha: sstep(1, 2, lt) * (1 - sstep(9, 10.5, lt)), shadow: 'rgba(0,0,0,.8)' });
  }
});
// ---------- 压缩在猜 → 猜错 → 片子吃掉自己 ----------
const MB = { w: 960, h: 540, bs: 16 };
const [MBc, MBx] = mk2d(960, 540), [MBt, MBtx] = mk2d(960, 540), [SRC, SRCx] = mk2d(960, 540);
let G270 = null;
function g270() { if (!G270) { G270 = makeGL(480, 270); for (const k of ['planet', 'demo', 'warp']) G270.add(k, SH[k]); } return G270; }
function srcAt(k, tt) { // 被吃掉的镜头：星球 → 谐波螺旋 → 像素隧道 → 流体
  SRCx.globalAlpha = 1;
  if (k === 0) SRCx.drawImage(g270().run('planet', { T: tt + 30, P: 1, Q: 2.9 }), 0, 0, 960, 540);
  else if (k === 1) { SRCx.fillStyle = '#060202'; SRCx.fillRect(0, 0, 960, 540); SRCx.strokeStyle = '#ff7a3a'; SRCx.lineWidth = 2; SRCx.beginPath(); for (let i = 0; i < 1400; i++) { const u = i / 40; const x = 480 + Math.sin(3 * u + tt) * Math.exp(-u * .02) * 240, y = 270 + Math.sin(2.02 * u) * Math.exp(-u * .02) * 230; i ? SRCx.lineTo(x, y) : SRCx.moveTo(x, y); } SRCx.stroke(); }
  else if (k === 2) SRCx.drawImage(g270().run('demo', { T: tt, P: 0, S: 0 }), 0, 0, 960, 540);
  else SRCx.drawImage(g270().run('warp', { T: tt * 2, P: 0 }), 0, 0, 960, 540);
  return SRC;
}
function vecAt(k, x, y, tt) { // 每个块的运动向量（像素/帧）
  const dx = x - 480, dy = y - 270, r = Math.hypot(dx, dy) + 1;
  const n = noise3(x * .004, y * .004, tt * .3);
  if (k === 0) return [2.2 + n * 2, n * 1.2];
  if (k === 1) return [-dy / r * 4, dx / r * 4];
  if (k === 2) return [dx / r * 5, dy / r * 5];
  return [Math.cos(n * 6) * 4, Math.sin(n * 6) * 4];
}
const MOSH = {
  init() { MBx.drawImage(srcAt(0, 0), 0, 0); this.f = -1; },
  step(f, lt) {
    // lt：相对镜头起点
    const mode = this.mode(lt); const k = mode.k, keep = mode.keep; const tt = lt;
    MBtx.drawImage(MBc, 0, 0); MBx.imageSmoothingEnabled = false;
    const bs = MB.bs;
    for (let y = 0; y < MB.h; y += bs) for (let x = 0; x < MB.w; x += bs) {
      const v = vecAt(k, x + bs / 2, y + bs / 2, tt); MBx.drawImage(MBt, Math.round(x - v[0]), Math.round(y - v[1]), bs, bs, x, y, bs, bs);
    }
    if (keep < 1) { MBx.globalAlpha = 1 - keep; MBx.drawImage(srcAt(mode.src, tt), 0, 0); MBx.globalAlpha = 1; }
  },
  mode(lt) { return MOSH.plan(lt); }
};
const DM = { t0: LS(54) - 0.3, cut: LS(56) + 1.6, eat: GP('eats itself')[0], end: LS(59) - 0.3, t1: A3[2] };
MOSH.plan = lt => {
  const t = DM.t0 + lt;
  if (t < DM.cut) return { k: 0, keep: 0, src: 0 };                 // 正常：每帧都有新画面
  if (t < DM.eat) return { k: 1, keep: .985, src: 1 };               // 关键帧删了：螺旋的运动拖着星球
  const e = (t - DM.eat) / (DM.end - DM.eat); const seg = Math.min(3, Math.floor(e * 4)); // 越来越快
  return { k: [2, 3, 1, 0][seg], keep: lerp(.97, .995, e), src: [1, 2, 3, 0][seg] };
};
shot(DM.t0, DM.t1, {
  flow: MOSH, grain: .05,
  draw(ctx, lt, t, f) {
    syncState(this, f);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(MBc, 0, 0, W, H);
    // 第一段：标出关键帧和运动箭头
    if (t < DM.cut) {
      const a = sstep(LS(55), LS(55) + .6, t) * (1 - sstep(DM.cut - .6, DM.cut, t));
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2;
      for (let y = 40; y < H; y += 80) for (let x = 40; x < W; x += 80) { const v = vecAt(0, x / 2, y / 2, lt); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + v[0] * 9, y + v[1] * 9); ctx.stroke(); }
      ctx.restore();
      // 胶片条：I 帧框出来
      const sy = 860; for (let k = 0; k < 12; k++) { const x = 140 + k * 140; const isI = k % 6 === 0; ctx.fillStyle = `rgba(0,0,0,${.6 * a})`; ctx.fillRect(x, sy - 120, 120, 70); ctx.strokeStyle = isI ? `rgba(255,225,74,${a})` : `rgba(255,255,255,${.35 * a})`; ctx.lineWidth = isI ? 5 : 2; ctx.strokeRect(x, sy - 120, 120, 70); txt(ctx, isI ? '关键帧' : '→', x + 60, sy - 72, { size: isI ? 28 : 34, align: 'center', color: isI ? '#ffe14a' : '#fff', alpha: a }); }
    }
    if (t > DM.cut - 1.0 && t < DM.cut + .4) { const a = sstep(DM.cut - 1, DM.cut - .7, t) * (1 - sstep(DM.cut, DM.cut + .4, t)); txt(ctx, '删掉关键帧', W / 2, 200, { size: 80, w: 700, align: 'center', color: '#ffe14a', alpha: a, shadow: 'rgba(0,0,0,.8)' }); }
    // RGB 撕裂：吃自己的段落里，卡在拍上
    if (t > DM.eat && t < DM.end) {
      const [, since] = beatIdx(t); const amt = Math.exp(-since * 8) * lerp(8, 28, (t - DM.eat) / (DM.end - DM.eat));
      if (amt > 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45; ctx.drawImage(MBc, -amt, 0, W, H); ctx.globalAlpha = .45; ctx.drawImage(MBc, amt, 0, W, H); ctx.restore(); }
      const pc = Math.exp(-since * 10); if (pc > .3) { const r = mulberry(Math.floor(t * 30)); for (let k = 0; k < 10; k++) { const y = Math.floor(r() * 34) * 32; ctx.drawImage(ctx.canvas, 0, y, W, 32, (r() - .5) * 200 * pc, y, W, 32); } }
    }
    const l57 = t - LS(57);
    eraTag(ctx, '2005', '村田健《Monster Movie》', sstep(.3, .9, l57) * (1 - sstep(7, 8, l57)));
    stamp(ctx, '史实', '史密森尼美国艺术博物馆收藏', 1580, 300, sstep(3.2, 3.6, l57) * (1 - sstep(8, 8.6, l57)));
    // 凝固成纯噪点
    const nz = sstep(LS(59) - 0.3, LS(59) + 0.6, t);
    if (nz > 0) { const r = mulberry(Math.floor(t * 30) + 5); const [nc, nx] = NZ; const im = nx.createImageData(480, 270); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } nx.putImageData(im, 0, 0); ctx.save(); ctx.globalAlpha = nz; ctx.imageSmoothingEnabled = false; ctx.drawImage(nc, 0, 0, W, H); ctx.restore(); }
  }
});
const NZ = mk2d(480, 270);
})();
