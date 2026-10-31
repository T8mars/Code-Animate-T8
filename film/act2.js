// ===== 第二幕 机器时代（1958–1997） =====
(() => {
const RED = '#ff5a36', AMB = '#ffb24a';
const A2 = SEG('a2');
// ---------- 幕卡 ----------
shot(A2[1], A2[1] + 3, {
  bloom: .5, tag: false,
  draw(ctx, lt) {
    actCard(ctx, lt, 3, {
      n: '第 二 幕', name: '机器时代', years: '1958 — 1997', accent: AMB, fg: '#ffd9c4', glow: 'rgba(255,90,54,.6)',
      under(c, lt) { // 阴极射线管的扫描束
        c.save(); c.globalAlpha = .5; c.strokeStyle = RED; c.lineWidth = 2;
        const y = (lt * 900) % H; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        c.globalAlpha = .07; c.fillStyle = '#000'; for (let yy = 0; yy < H; yy += 4) c.fillRect(0, yy, W, 2); c.restore();
      }
    });
  }
});

// ---------- 指挥仪：齿轮与凸轮（概念示意） ----------
function gear(c, x, y, r, teeth, ang, col, lw = 3) {
  c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
  const tw = Math.PI * 2 / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * tw; const r1 = r, r2 = r + Math.max(10, r * 0.12);
    const p = [[a, r1], [a + tw * .2, r2], [a + tw * .5, r2], [a + tw * .7, r1]];
    p.forEach(([aa, rr], j) => { const X = Math.cos(aa) * rr, Y = Math.sin(aa) * rr; (k === 0 && j === 0) ? c.moveTo(X, Y) : c.lineTo(X, Y); });
  }
  c.closePath(); c.stroke();
  c.beginPath(); c.arc(0, 0, r * .28, 0, 7); c.stroke();
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; c.beginPath(); c.moveTo(Math.cos(a) * r * .28, Math.sin(a) * r * .28); c.lineTo(Math.cos(a) * r * .82, Math.sin(a) * r * .82); c.stroke(); }
  c.beginPath(); c.arc(0, 0, r * .82, 0, 7); c.stroke();
  c.restore();
}
function crtFX(c) { c.save(); c.globalAlpha = .1; c.fillStyle = '#000'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2); c.restore(); }
shot(A2[1] + 3, LS(30) - 0.25, {
  bloom: .9, bthr: .2,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#060202'; ctx.fillRect(0, 0, W, H);
    const z = 1 + lt * 0.018; ctx.save(); ctx.translate(W * .42, H / 2); ctx.scale(z, z); ctx.translate(-W * .42, -H / 2);
    const w = lt * 0.6;
    gear(ctx, 600, 520, 210, 28, w, RED);
    gear(ctx, 600 + 210 + 128, 520 - 40, 120, 16, -w * 28 / 16 + 0.1, RED);
    gear(ctx, 600 - 30, 520 + 210 + 100, 90, 12, -w * 28 / 12 + .2, AMB, 2.5);
    gear(ctx, 600 + 210 + 128 + 120 + 74, 480 + 60, 64, 10, w * 28 / 10, RED, 2.5);
    // 凸轮 + 从动杆
    const ca = w * 1.7, cx0 = 1180, cy0 = 760;
    ctx.save(); ctx.strokeStyle = AMB; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = 0; k <= 120; k++) { const a = k / 120 * Math.PI * 2; const rr = 70 + 38 * Math.pow(.5 + .5 * Math.cos(a - ca), 2); const X = cx0 + Math.cos(a) * rr, Y = cy0 + Math.sin(a) * rr; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke(); const fy = cy0 - (70 + 38 * Math.pow(.5 + .5 * Math.cos(-Math.PI / 2 - ca), 2));
    ctx.beginPath(); ctx.moveTo(cx0, fy); ctx.lineTo(cx0, fy - 190); ctx.lineTo(cx0 + 260, fy - 190); ctx.stroke(); ctx.beginPath(); ctx.arc(cx0, fy, 8, 0, 7); ctx.stroke(); ctx.restore();
    ctx.restore();
    // 示波器小窗：算出的弹道
    const sx = 1300, sy = 150, sw = 520, sh = 340;
    ctx.save(); ctx.strokeStyle = 'rgba(255,90,54,.6)'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, sh);
    ctx.globalAlpha = .25; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sx + i * sw / 6, sy); ctx.lineTo(sx + i * sw / 6, sy + sh); ctx.stroke(); } for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx, sy + i * sh / 4); ctx.lineTo(sx + sw, sy + i * sh / 4); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = AMB; ctx.lineWidth = 3; ctx.beginPath();
    const n = 3; for (let s = 0; s < n; s++) { const ph = (lt * 0.35 + s / n) % 1; const v = 0.75 + s * 0.12; for (let k = 0; k <= 60 * ph; k++) { const u = k / 60; const X = sx + 20 + u * (sw - 40), Y = sy + sh - 20 - (sh - 50) * 4 * u * (1 - u) * v; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } }
    ctx.stroke(); ctx.restore();
    txt(ctx, 'y = v·t·sinθ − ½·g·t²', sx, sy + sh + 52, { size: 32, font: FONT.mono, color: AMB, alpha: sstep(1, 2, lt) });
    eraTag(ctx, '1945', '高射炮指挥仪 · 示意', sstep(.3, 1, lt));
    crtFX(ctx); fadeBlack(ctx, 1 - sstep(0, .6, lt));
  }
});

// ---------- 惠特尼：摆 + 转台 = 螺旋 ----------
function harm(tau, a, b, d, k, om) {
  const e = Math.exp(-k * tau); let x = Math.sin(a * tau + d) * e, y = Math.sin(b * tau) * e;
  const r = om * tau; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}
shot(LS(30) - 0.25, LS(32) - 0.2, {
  bloom: .9, bthr: .2, xin: .5,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#060202'; ctx.fillRect(0, 0, W, H);
    const ratio = lerp(1.5, 1.52, sstep(5, 10, lt)) + 0.004 * lt; const a = 3, b = a / ratio;
    const cx = 760, cy = 540, R = 400;
    const span = lerp(0, 95, ease.inout(lt / 10.5)), k = 0.016, om = 0.0105, d = 0.6;
    // 转台
    ctx.save(); ctx.strokeStyle = 'rgba(255,90,54,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, 7); ctx.stroke();
    for (let i = 0; i < 24; i++) { const an = i / 24 * 6.283 + span * om; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * R * 1.04, cy + Math.sin(an) * R * 1.04); ctx.lineTo(cx + Math.cos(an) * R * 1.08, cy + Math.sin(an) * R * 1.08); ctx.stroke(); }
    ctx.restore();
    // 图形：越旧越暗
    const N = Math.floor(span * 12);
    ctx.save(); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const tau = i / 12; const [x, y] = harm(tau, a, b, d, k, om); const X = cx + x * R, Y = cy + y * R;
      if (prev && i % 1 === 0) { const age = (N - i) / Math.max(1, N); ctx.strokeStyle = i > N - 30 ? '#fff0d0' : `rgba(255,${90 + 100 * (1 - age) | 0},54,${0.25 + 0.75 * (1 - age)})`; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(X, Y); ctx.stroke(); }
      prev = [X, Y];
    }
    ctx.restore();
    if (prev) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(prev[0], prev[1], 7, 0, 7); ctx.fill();
      // 摆臂
      ctx.strokeStyle = 'rgba(255,178,74,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cx - 40, 40); ctx.stroke(); }
    codeBox(ctx, ['x = sin(a*t + d)', 'y = sin(b*t)', `a : b = 3 : ${b.toFixed(3)}`], 1270, 300, lt * 1.2, { rate: 40, size: 34 });
    const l31 = t - LS(31);
    eraTag(ctx, '1958', '《迷魂记》片头的螺旋', sstep(0, .6, l31));
    stamp(ctx, '史实', null, 1600, 760, sstep(0.4, 0.8, l31) * (1 - sstep(5, 5.6, l31)));
    crtFX(ctx);
  }
});

// ---------- 弹道 → 画 ----------
shot(LS(32) - 0.2, LS(34) - 0.2, {
  bloom: 1, bthr: .2, xin: .4,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#060202'; ctx.fillRect(0, 0, W, H);
    const tr = ease.inout((t - LS(33) + 0.3) / 3.2); // 0 = 弹道, 1 = 花
    const cx = W / 2, cy = 560; const nArc = 12;
    ctx.save(); ctx.lineCap = 'round';
    for (let s = 0; s < nArc; s++) {
      const fire = s * 0.32; const ph = clamp((lt - fire) / 1.6); if (ph <= 0) continue;
      const v = 0.6 + 0.4 * ((s * 7) % 5) / 4;
      const pts = [];
      for (let k = 0; k <= 80; k++) {
        const u = k / 80 * Math.min(1, ph + tr);
        // 弹道坐标
        let X = 160 + u * 1600, Y = 900 - 4 * u * (1 - u) * 640 * v;
        // 花：同一条弧，绕中心旋转排布
        const ang = s / nArc * Math.PI * 2 + lt * 0.15; const lx = (u - .5) * 760, ly = -4 * u * (1 - u) * 300 * v + 150;
        const FX = cx + lx * Math.cos(ang) - ly * Math.sin(ang), FY = cy + lx * Math.sin(ang) + ly * Math.cos(ang);
        pts.push([lerp(X, FX, tr), lerp(Y, FY, tr)]);
      }
      ctx.strokeStyle = s % 3 === 0 ? AMB : RED; ctx.lineWidth = 2.6; ctx.globalAlpha = .9; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      const hd = pts[pts.length - 1]; if (ph < 1 && tr < .5) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 6, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    // 地面线淡出
    ctx.save(); ctx.globalAlpha = 1 - tr; ctx.strokeStyle = 'rgba(255,90,54,.5)'; ctx.beginPath(); ctx.moveTo(100, 902); ctx.lineTo(W - 100, 902); ctx.stroke(); ctx.restore();
    crtFX(ctx);
  }
});

// ---------- 《目录》→ 谐波光笼（Whitney：第 i 个点以 i 倍的速度转） ----------
const CAGE = { N: 260 };
function cagePhi(lt) { // m(t) 每 2 拍跨过一个整数：每到整数，所有点排成 m 瓣
  const beat = 60 / 99.4 * 2, t0 = 4.2; const m = lt < t0 ? 60 - lt * 2 : Math.max(1.0, 29 - (lt - t0) / beat);
  return Math.PI * 2 / m;
}
shot(LS(34) - 0.2, LS(35) - 0.5, {
  bloom: 1.1, bthr: .15, xin: .5, grain: .04,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, H);
    const N = CAGE.N; const side = ease.inout((lt - 16) / 7); // 俯视 → 侧视
    const yaw = lt * 0.05 + side * 0.6, pitch = lerp(Math.PI / 2 - 0.02, 0.32, side);
    const F = 1400, D = lerp(2200, 1750, side);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = (x, y, z) => { // y 向上
      let X = x * cy - z * sy, Z = x * sy + z * cy; let Y = y * cp - Z * sp; Z = y * sp + Z * cp;
      const dz = Z + D; return [W / 2 + X * F / dz, H / 2 - Y * F / dz, F / dz];
    };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const trail = 7;
    for (let i = 1; i <= N; i++) {
      const hue = (i / N * 300 + 10 + lt * 4) % 360;
      for (let k = trail; k >= 0; k--) {
        const tt = lt - k * 0.025; const phi = cagePhi(tt) * i + tt * 0.2;
        const th = (i - 0.5) / N * Math.PI, RR = 470; const r = RR * Math.sin(th) * lerp(1, .55 + .45 * i / N, 1 - side), hgt = RR * Math.cos(th) * side;
        const p = proj(Math.cos(phi) * r, hgt, Math.sin(phi) * r);
        const s = p[2] * (k === 0 ? 4.2 : 2.6 * (1 - k / trail));
        ctx.globalAlpha = k === 0 ? .9 : .25 * (1 - k / trail);
        ctx.fillStyle = `hsl(${hue},90%,${k === 0 ? 66 : 55}%)`; ctx.beginPath(); ctx.arc(p[0], p[1], s, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
    const l34 = t - LS(34);
    eraTag(ctx, '1961', '《目录》Catalog', sstep(.2, .8, l34) * (1 - sstep(6.5, 7.5, l34)));
    if (lt > 8 && lt < 15) codeBox(ctx, ['angle[i] = i * phi(t)'], 72, 210, (lt - 8) * 1.4, { alpha: sstep(8, 8.5, lt) * (1 - sstep(14.2, 15, lt)), size: 32 });
  }
});

// ---------- 1982：一切看起来都像机器 ----------
shot(LS(35) - 0.5, LS(37) - 0.3, {
  bloom: .45, bthr: .4, xin: .6,
  draw(ctx, lt, t) {
    const z = 60 * ease.inout(lt / 14) - 8; draw1982(ctx, { x: Math.sin(lt * 0.25) * 1.5, y: 3.4, z }, lt);
    eraTag(ctx, '1981', '为迪士尼《电子世界争霸战》做电脑画面', sstep(.3, 1, lt) * (1 - sstep(6, 7, lt)));
    const l36 = t - LS(36);
    if (l36 > -0.2) {
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${.45 * sstep(0, .5, l36)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      bigWords(ctx, '“一切看起来都像机器”', 470, sstep(0.4, 1.0, l36), { size: 92 });
      txt(ctx, '“machine-like”  —— Ken Perlin', W / 2, 570, { size: 46, font: FONT.disp, w: 500, align: 'center', color: 'rgba(237,230,214,0.8)', alpha: sstep(1.0, 1.6, l36) });
      stamp(ctx, '史实', '出自 Perlin 本人的讲述', 1600, 760, sstep(1.6, 2.0, l36));
    }
  }
});

// ---------- 完美的球：越来越精确，越来越假 ----------
shot(LS(37) - 0.3, GP('two curves')[0], {
  bloom: .5, bthr: .3, xin: .5,
  draw(ctx, lt, t) {
    const Q = lerp(3.4, 2.7, ease.inout(lt / 8));
    const im = G720.run('planet', { T: 2, P: 0, Q });
    ctx.drawImage(im, 0, 0, W, H);
    const pr = 1.6 * H / Math.sqrt(Q * Q - 1);
    // 高光越来越锐
    const sharp = sstep(0.5, 7.5, lt), ang = -2.3 + lt * 0.25;
    const hx = W / 2 + Math.cos(ang) * pr * .45, hy = H / 2 + Math.sin(ang) * pr * .45;
    const rr = lerp(pr * .5, pr * .06, sharp);
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, rr); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(lerp(.2, .85, sharp), `rgba(230,250,255,${lerp(.5, .95, sharp)})`); g.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, pr, 0, 7); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    txt(ctx, `smoothness = ${(0.9 + sharp * 0.0999).toFixed(4)}`, 72, 140, { size: 34, font: FONT.mono, color: '#9fe6ff', alpha: sstep(.4, 1, lt) });
    const l38 = t - LS(38);
    if (l38 > 0) { const a = sstep(0.3, 0.9, l38) * (1 - sstep(2.6, 3.0, l38)); ctx.save(); ctx.globalAlpha = a * .75; ctx.fillStyle = '#04070c'; ctx.beginPath(); ctx.roundRect(W / 2 - 420, 120, 840, 120, 18); ctx.fill(); ctx.restore(); bigWords(ctx, '问题，就出在太精确', 205, a, { size: 80 }); }
  }
});

// ---------- 两条曲线 → 随机，但是连续 ----------
const CODE_P1 = ['// 1983：随机，但是连续', 'float noise(float x) {', '  float i = floor(x), f = fract(x);', '  float u = f*f*(3.0 - 2.0*f);', '  return mix(grad(i)*f, grad(i+1.0)*(f-1.0), u);', '}'];
function rnd1(k) { const h = Math.sin(k * 91.7 + 3.1) * 43758.5; return h - Math.floor(h); }
shot(GP('two curves')[0], GP('one take noise')[0], {
  bloom: .35, bthr: .35, xin: .6,
  draw(ctx, lt, t) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    const l39 = t - LS(39); const merge = ease.inout((lt - 8.5) / 3); // 金线居中
    const rev = ease.out(lt / 2.2), scroll = lt * 170, xl = 140, xr = W - 140;
    // 随机
    ctx.save(); ctx.globalAlpha = 1 - merge;
    txt(ctx, '纯随机', xl, 250, { size: 48, w: 700 }); txt(ctx, 'random()', xl + 180, 250, { size: 34, font: FONT.mono, color: 'rgba(237,230,214,0.55)' });
    ctx.strokeStyle = 'rgba(237,230,214,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = xl; x < lerp(xl, xr, rev); x += 4) { const k = Math.floor((x + scroll) / 9); const y = 400 + (rnd1(k) - .5) * 200; x === xl ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    txt(ctx, 'Perlin 噪声', xl, 620, { size: 48, w: 700, color: C.gold }); ctx.restore();
    // 噪声
    const yb = lerp(790, 560, merge), amp = lerp(250, 300, merge);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath();
    for (let x = xl * (1 - merge); x < lerp(xl, xr, rev) + merge * 200; x += 3) { const y = yb + noise3((x + scroll) * 0.0045, 0.37, 0) * amp; x <= xl * (1 - merge) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    if (l39 > -0.2) {
      bigWords(ctx, '随机，但是连续', 230, sstep(1.2, 1.8, l39), { color: '#FFE7B8', size: 104 });
      eraTag(ctx, '1983', null, sstep(0, .5, l39));
    }
  }
});

// ---------- 一镜到底：曲线 → 二维场 → 三维 → 倍频 → 云/大理石/火焰/山脉 ----------
let OCT = null;
function needOct() {
  if (OCT) return; const N = 512; const A = new Float32Array(N * N * 4), B = new Float32Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    for (let o = 0; o < 7; o++) { const fq = 2 * Math.pow(2, o); const v = pnoise2(x / N * fq + o * 0.37, y / N * fq + o * 0.71, fq) * 1.3; if (o < 4) A[i + o] = v; else B[i + o - 4] = v; }
  }
  OCT = { N, A, B, t1: G720.texRGBA16(A, N), t2: G720.texRGBA16(B, N), s1: G540.texRGBA16(A, N), s2: G540.texRGBA16(B, N) };
}
function octCPU(x, z, Q) { // 与着色器同一份数据：世界坐标 → 纹理（双线性）
  const N = OCT.N; let u = x * .025 * N - .5, v = z * .025 * N - .5; const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
  let s = 0;
  for (let o = 0; o < 7; o++) { const w = clamp(Q - o) * Math.pow(.5, o); if (w <= 0) break; const arr = o < 4 ? OCT.A : OCT.B, c = o % 4;
    const g = (ii, jj) => arr[((((jj % N) + N) % N) * N + (((ii % N) + N) % N)) * 4 + c];
    s += w * lerp(lerp(g(i0, j0), g(i0 + 1, j0), fu), lerp(g(i0, j0 + 1), g(i0 + 1, j0 + 1), fu), fv); }
  return s;
}
window.A2X = { needOct, oct: () => OCT };
const OT = { t0: GP('one take noise')[0] };
shot(OT.t0, LS(41) - 0.2, {
  bloom: .12, bthr: .6,
  init() { needOct(); },
  draw(ctx, lt, t) {
    // 关键帧
    const k = (a, b) => ease.inout((lt - a) / (b - a));
    const lift = k(5, 10);                     // 抬升成三维
    const flat = k(19.5, 22.5) * (1 - k(33, 37.5)); // 回到俯视再抬起
    const AMP = 7 * lift * (1 - flat);
    const Q = 1 + 6 * k(10, 19);
    const PIT = lerp(-1.5707, -0.5, lift * (1 - flat));
    const ALT = lerp(56, 17, lift * (1 - flat)) - 3 * k(33, 37.5);
    const MODE = 1 * k(22.5, 25) + 1 * k(25.5, 28) + 1 * k(28.5, 31) + 1 * k(31.5, 34);
    const LIT = Math.max(lift * (1 - flat), k(33, 36));
    const CZ = lt * 2.2 * lift - 30 * 0;
    const REV = lt < 5 ? lerp(-12 + CZ, 14 + CZ, ease.inout(lt / 4.6)) : 999;
    const im = G540.run('field3d', { Q, tex: OCT.s1, tex2: OCT.s2, U: { PIT, ALT, AMP, MODE, REV: lt < 5 ? REV : 1e4, CZ, YAW: 0, LIT } });
    ctx.drawImage(im, 0, 0, W, H);
    // 第一段：扫描线上的曲线就是这一行的截面
    if (lt < 5.2) {
      const sy = H / 2 - (REV - CZ) * 1.5 / ALT * H; const a = 1 - sstep(4.5, 5.2, lt);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath();
      for (let x = 0; x <= W; x += 4) { const wx = (x - W / 2) / H * ALT / 1.5; const v = octCPU(wx, REV, 1); const y = sy - v * 260; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
      { const a = sstep(.4, 1, lt) * (1 - sstep(4.2, 5, lt)); ctx.save(); ctx.globalAlpha = a * .7; ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.roundRect(W / 2 - 330, 92, 660, 84, 14); ctx.fill(); ctx.restore(); txt(ctx, '一维曲线  →  二维的场', W / 2, 150, { size: 50, align: 'center', color: '#FFE7B8', alpha: a }); }
    }
    if (lt > 5.5 && lt < 9.8) { const a = sstep(5.5, 6.2, lt) * (1 - sstep(9, 9.8, lt)); ctx.save(); ctx.globalAlpha = a * .7; ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.roundRect(W / 2 - 330, 92, 660, 84, 14); ctx.fill(); ctx.restore(); txt(ctx, '二维的场  →  三维的山', W / 2, 150, { size: 50, align: 'center', color: '#FFE7B8', alpha: a }); }
    // 倍频计数
    if (lt > 9.6 && lt < 20) {
      const a = sstep(9.6, 10.2, lt) * (1 - sstep(19.2, 20, lt));
      txt(ctx, String(Math.floor(Q + 1e-3)), 110, 330, { size: 220, w: 600, font: FONT.grot, color: '#fff', shadow: 'rgba(0,0,0,.7)', blur: 30, alpha: a });
      txt(ctx, '层', Q >= 10 ? 380 : 260, 330, { size: 64, color: '#fff', shadow: 'rgba(0,0,0,.7)', alpha: a });
      txt(ctx, '每多一层：频率 ×2，振幅 ×½', 116, 410, { size: 40, color: 'rgba(255,255,255,0.9)', shadow: 'rgba(0,0,0,.8)', alpha: a });
    }
    // 同一个函数，换种着色
    const names = [['同一个函数', 20.5, 22.5], ['云', 23.2, 25.4], ['大理石', 26.2, 28.4], ['火焰', 29.2, 31.4], ['山脉', 32.2, 35.5]];
    for (const [s, a0, a1] of names) if (lt > a0 && lt < a1) { const a = sstep(a0, a0 + .3, lt) * (1 - sstep(a1 - .4, a1, lt)); const g = ctx.createRadialGradient(W / 2, 480, 0, W / 2, 480, 520); g.addColorStop(0, `rgba(0,0,0,${.78 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    for (const [s, a0, a1] of names) if (lt > a0 && lt < a1) bigWords(ctx, s, 520, sstep(a0, a0 + .3, lt) * (1 - sstep(a1 - .4, a1, lt)), { size: s.length > 3 ? 96 : 150, ls: 20, color: '#fff' });
    // 1985 论文
    const l40 = t - LS(40);
    if (l40 > 0) { const a = sstep(0, .6, l40);
      txt(ctx, 'SIGGRAPH ’85', W - 90, 160, { size: 60, font: FONT.disp, w: 600, align: 'right', color: '#fff3dc', alpha: a, shadow: 'rgba(0,0,0,.7)' });
      txt(ctx, '“An Image Synthesizer”', W - 90, 222, { size: 42, font: FONT.disp, w: 500, align: 'right', color: 'rgba(255,243,220,.85)', alpha: sstep(.4, 1, l40), shadow: 'rgba(0,0,0,.7)' });
      eraTag(ctx, '1985', null, a); }
    fadeBlack(ctx, sstep(LS(41) - 0.6 - OT.t0, LS(41) - 0.2 - OT.t0, lt) * 0.0);
  }
});

// ---------- 奖章 ----------
shot(LS(41) - 0.2, GP('planet')[0], {
  bloom: .5, bthr: .3, xin: .5,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#030303'; ctx.fillRect(0, 0, W, H);
    const im = G720.run('medal', { S: lt * 0.9 + 1.2, P: -0.5 + lt * 0.07, Q: ease.out(lt / 7.5) });
    ctx.drawImage(im, -540, 0, W, H);
    const a = sstep(0.6, 1.2, lt);
    txt(ctx, '1997', 1150, 330, { size: 110, w: 600, font: FONT.grot, color: '#FFE2A8', alpha: a });
    txt(ctx, '奥斯卡技术成就奖', 1150, 450, { size: 76, w: 900, color: '#FFF1C9', alpha: sstep(.9, 1.5, lt), ls: 6 });
    txt(ctx, 'Ken Perlin · Perlin Noise', 1152, 530, { size: 44, font: FONT.disp, w: 600, color: C.cream, alpha: sstep(1.3, 1.9, lt) });
    txt(ctx, '“…to produce natural', 1152, 610, { size: 38, font: FONT.disp, color: 'rgba(237,230,214,.7)', alpha: sstep(1.8, 2.4, lt) });
    txt(ctx, 'appearing textures…”', 1180, 656, { size: 38, font: FONT.disp, color: 'rgba(237,230,214,.7)', alpha: sstep(1.8, 2.4, lt) });
    txt(ctx, '奖章为本片原创设计', 1152, 760, { size: 36, font: FONT.sans, color: 'rgba(237,230,214,.5)', alpha: sstep(2.4, 3, lt) });
  }
});

// ---------- 机器球 → 有机星球（全幕情绪高点） ----------
const PL = { t0: GP('planet')[0], hit: 466.0 };
const flowR = new Flow({
  n: 9000, seed: 14, transparent: true, fade: 0.05, w: 1.3, comp: 'lighter', cols: ['rgba(242,196,109,0.35)', 'rgba(255,220,160,0.3)', 'rgba(255,150,80,0.25)'],
  spawnPos: r => { const a = r() * 6.2832, rr = lerp(560, 860, Math.pow(r(), 0.8)); return [W / 2 + Math.cos(a) * rr * 1.25, H / 2 + Math.sin(a) * rr * 0.3]; },
  velFn(x, y, tt) { const dx = (x - W / 2) / 1.25, dy = (y - H / 2) / 0.3, r = Math.hypot(dx, dy) + 1e-3; const n = noise3(x * 0.002, y * 0.002, tt) * 2.2; const sp = 3.6 * 380 / r; return [(-dy / r * sp + dx / r * n * .6) * 1.25, (dx / r * sp + dy / r * n * .6) * 0.3]; },
  life: [90, 260], split: true, backFn: (x, y) => y < H / 2
});
const [RG, RGx] = mk2d();
shot(PL.t0, A2[2], {
  flow: flowR, xin: .8,
  draw(ctx, lt, t, f) {
    const hl = t - PL.hit;                                  // 相对光环展开
    const P = ease.inout((lt - 3.5) / 16.5);
    const back = ease.inout((t - LS(42) + 0.5) / 7.5);      // 拉远成一个光点
    const Q = lerp(lerp(2.6, 3.4, ease.inout(lt / 24)), 34, back * back);
    const im = G1080.run('planet', { T: lt + 2, P, Q });
    ctx.drawImage(im, 0, 0, W, H);
    // 高潮前 1 拍抽暗
    const pre = sstep(-1.4, -0.3, hl) * (1 - sstep(-0.3, 0, hl)); fadeBlack(ctx, pre * 0.3);
    // 光环（粒子流）
    if (hl > -0.4) {
      syncState(this, f);
      const ga = ease.out((hl + 0.4) / 1.6) * (1 - back);
      const pr = 1.6 * H / Math.sqrt(Q * Q - 1), pr0 = 1.6 * H / Math.sqrt(3.4 * 3.4 - 1), sc = pr / pr0;
      const spread = lerp(0.55, 1, ease.out((hl + 0.4) / 2.2));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc * spread, sc * spread); ctx.translate(-W / 2, -H / 2);
      ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.arc(W / 2, H / 2, pr0 * 1.01 / spread, 0, 7); ctx.clip('evenodd'); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 * ga; ctx.drawImage(flowR.cv2, 0, 0); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * ga; ctx.drawImage(flowR.cv, 0, 0); ctx.restore();
    }
    if (hl > 0) flash(ctx, 0.55 * (1 - hl / 0.25));
    bloom(ctx, .35 + .3 * sstep(-.2, .5, hl) * (1 - back), .3);
    fadeBlack(ctx, sstep(A2[2] - 2.6, A2[2] - 0.4, t));
  }
});
})();
