// ===== 冷开场：一只鹈鹕骑过二十个时代 =====
(() => {
const CO = SEG('cold');
const PEL_X = W * 0.43, PEL_Y = H * 0.83, PEL_S = 0.78;
const [WA, WAx] = mk2d(), [WB, WBx] = mk2d(), [PXc, PXx] = mk2d(240, 135);
// ---------- 开头：考题 ----------
const PROMPT = 'Generate an SVG of a pelican riding a bicycle';
function badPel(c, x, y, s, seed, t, o = {}) { pelican(c, x, y, s, Object.assign({ bad: seed, ph: t * 3 + seed, lw: 9, col: ['#f4f1ea', '#d9e6ff', '#ffe8cc', '#e8ffe8'][seed % 4] }, o)); }
shot(0, GP('twenty frames')[0], {
  grain: .03,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    // 打字
    const typed = PROMPT.slice(0, Math.floor(clamp(t / 0.85) * PROMPT.length));
    const pa = 1 - sstep(LS(2) - .1, LS(2) + .2, t);
    if (pa > 0) {
      txt(ctx, '> ' + typed + (Math.floor(t * 3) % 2 ? '▍' : ''), W / 2, H / 2, { size: 46, font: FONT.mono, align: 'center', color: '#e9e4d8', alpha: pa });
      txt(ctx, '鹈鹕测试 · Simon Willison · 2024', W - 80, H - 170, { size: 38, align: 'right', color: 'rgba(233,228,216,.85)', alpha: pa });
    }
    // 答卷：一只惨不忍睹的鹈鹕
    const l2 = t - LS(2);
    const tile = clamp((t - LS(3)) / (LE(3) - LS(3) - .5));
    const n = Math.floor(Math.pow(tile, 1.6) * 40);
    const collapse = ease.inout((t - LS(5) - .3) / 2.6);
    const blink = t > LS(4) + 1.2 && t < LS(4) + 1.5;
    if (l2 > 0 && collapse < 1) {
      ctx.save(); ctx.globalAlpha = 1 - sstep(.6, 1, collapse);
      // 第一只（居中、弹出）
      const pop = ease.out(l2 / .25) * (1 + .15 * Math.exp(-l2 * 8) * Math.sin(l2 * 40));
      const s0 = lerp(.75, .3, sstep(LS(3), LS(3) + 1.5, t)) * pop;
      const x0 = lerp(W / 2, 260, sstep(LS(3), LS(3) + 1.5, t)), y0 = lerp(H * .78, 330, sstep(LS(3), LS(3) + 1.5, t));
      badPel(ctx, lerp(x0, W / 2, collapse), lerp(y0, H * .7, collapse), s0 * (1 - collapse * .4), 3, t, { blink });
      // 越来越多
      for (let k = 0; k < n; k++) {
        const r = mulberry(k * 17 + 4); const cx = 140 + (k % 8) * 235 + (r() - .5) * 60, cy = 300 + Math.floor(k / 8) * 175 + (r() - .5) * 40;
        const born = LS(3) + Math.pow((k + 1) / 40, 1 / 1.6) * (LE(3) - LS(3) - .5); const age = t - born;
        const sc = .32 * ease.out(age / .18) * (1 + .2 * Math.exp(-age * 9));
        badPel(ctx, lerp(cx, W / 2, collapse), lerp(cy, H * .7, collapse), sc * (1 - collapse * .7), k + 5, t, { blink });
      }
      ctx.restore();
    }
    // 日期飞快跳
    if (t > LS(3) && t < LS(5)) { const p = clamp((t - LS(3)) / (LE(3) - LS(3))); const m = Math.floor(p * 24); const y = 2024 + Math.floor((m + 9) / 12), mo = (m + 9) % 12 + 1; txt(ctx, `${y}.${String(mo).padStart(2, '0')}`, 80, 120, { size: 64, font: FONT.grot, w: 600, color: '#fff', alpha: 1 - sstep(LS(5) - .4, LS(5), t) }); }
    // 弹幕：又一只
    if (t > LS(4) + .6 && t < LS(5) + .8) { for (let k = 0; k < 9; k++) { const r = mulberry(k * 5 + 1); const st = LS(4) + .6 + k * .32; const x = W + 100 - (t - st) * 900; if (x < -400 || t < st) continue; txt(ctx, ['又一只', '又一只鹈鹕', '哦', '又来', '又一只'][k % 5], x, 180 + r() * 600, { size: 44, color: '#fff', alpha: .85, shadow: 'rgba(0,0,0,.9)', blur: 6 }); } }
    // 收拢成一只干净的白鹈鹕，冲向第一道画框
    if (collapse > 0) {
      const a = sstep(.5, .9, collapse);
      const go = ease.in((t - (GP('twenty frames')[0] - 2.2)) / 2.2);
      const s = lerp(.55, PEL_S, a) * (1 + go * .1), x = lerp(W / 2, PEL_X, a);
      // 第一道画框从远处飞来
      if (go > 0) { const fs = lerp(.05, 1.6, Math.pow(go, 2.2)); const fw = W * fs, fh = H * fs; ctx.save(); ctx.translate(W * .55, H / 2); ctx.fillStyle = '#c99a4a'; ctx.strokeStyle = '#6a4a1e'; ctx.lineWidth = 24 * fs; ctx.strokeRect(-fw / 2, -fh / 2, fw, fh); ctx.fillStyle = '#c4a678'; ctx.globalAlpha = .9; ctx.fillRect(-fw / 2 + 12 * fs, -fh / 2 + 12 * fs, fw - 24 * fs, fh - 24 * fs); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = a; pelican(ctx, x, PEL_Y, s, { ph: t * 6 * (1 + go * 2), col: '#ffffff', lw: 8 }); ctx.restore();
    }
  }
});

// ---------- 二十个时代 ----------
const WORLDS = [];
function world(name, era, pel, bg, post) { const st = (new Error().stack || '').split('\n').map(l => l.match(/\/(cold\.js):(\d+):\d+/)).filter(Boolean); const m = st[1] || st[0]; WORLDS.push({ name, era, pel, bg, post, src: m ? m[1] + ':' + m[2] : '' }); }
const P0 = { col: '#f4f1ea', line: '#1d2430', beak: '#f2a33a', pouch: '#f7c46b', lw: 8 };
const mono = (c, a = 1) => ({ col: c, line: c, beak: c, pouch: c, fill: false, lw: 9 * a });
let OCTc = null;
// 0 岩画
world('rock', ['史前', '撒哈拉岩画'], { col: 'rgba(0,0,0,0)', line: '#8a2e12', beak: '#8a2e12', pouch: 'rgba(0,0,0,0)', fill: false, lw: 14 }, (c, t) => {
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#c98e5a'); g.addColorStop(1, '#a8683c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = mulberry(3); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${90 + r() * 60},${50 + r() * 30},${20},${.08 + r() * .1})`; c.beginPath(); c.ellipse(r() * W, r() * H, 20 + r() * 120, 8 + r() * 40, r() * 3, 0, 7); c.fill(); }
  c.strokeStyle = '#8a2e12'; c.fillStyle = '#8a2e12'; c.lineWidth = 9; c.lineCap = 'round';
  for (let k = 0; k < 5; k++) { const x = 1250 + k * 120, y = 360 + (k % 2) * 40; c.beginPath(); c.arc(x, y - 70, 14, 0, 7); c.fill(); c.beginPath(); c.moveTo(x, y - 55); c.lineTo(x, y); c.lineTo(x - 25, y + 60); c.moveTo(x, y); c.lineTo(x + 25, y + 60); c.moveTo(x - 35, y - 35); c.lineTo(x + 35, y - 45); c.stroke(); }
  for (let k = 0; k < 3; k++) { const x = 300 + k * 260, y = 250; c.beginPath(); c.ellipse(x, y, 80, 34, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + 60, y - 20); c.lineTo(x + 110, y - 70); c.stroke(); for (const lx of [-50, -20, 30, 55]) { c.beginPath(); c.moveTo(x + lx, y + 20); c.lineTo(x + lx, y + 80); c.stroke(); } }
});
// 1 汉画像石拓片
world('han', ['东汉', '画像石拓片'], { col: '#151515', line: '#e8e2d2', beak: '#e8e2d2', pouch: '#151515', lw: 7 }, (c, t) => {
  c.fillStyle = '#121212'; c.fillRect(0, 0, W, H); const r = mulberry(5);
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(230,225,210,${r() * .12})`; c.fillRect(r() * W, r() * H, 2 + r() * 5, 2 + r() * 5); }
  c.strokeStyle = '#d8d2c0'; c.lineWidth = 5; c.strokeRect(60, 60, W - 120, H - 120); c.strokeRect(84, 84, W - 168, H - 168);
  for (let x = 110; x < W - 110; x += 60) { c.beginPath(); c.moveTo(x, 100); c.lineTo(x + 30, 130); c.lineTo(x + 60, 100); c.stroke(); }
  c.fillStyle = '#d8d2c0'; for (let k = 0; k < 4; k++) { const x = 1250 + k * 150; c.beginPath(); c.moveTo(x, 520); c.quadraticCurveTo(x + 40, 420, x + 90, 470); c.lineTo(x + 70, 560); c.closePath(); c.fill(); }
});
// 2 宋画水墨
world('song', ['北宋', '水墨山水'], { col: '#f3efe4', line: '#2a2a2a', beak: '#5a4a3a', pouch: '#d8d0c0', lw: 6 }, (c, t) => {
  c.fillStyle = '#efe8d8'; c.fillRect(0, 0, W, H); const r = mulberry(11);
  for (let layer = 0; layer < 4; layer++) { const a = .18 + layer * .16; c.fillStyle = `rgba(30,30,30,${a})`; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20) { const y = 260 + layer * 140 - 220 * Math.max(0, noise3(x * .0025 + layer * 3, layer, 1)) - 60 * noise3(x * .01, layer, 2); c.lineTo(x, y); } c.lineTo(W, H); c.fill(); c.fillStyle = 'rgba(239,232,216,.55)'; c.fillRect(0, 380 + layer * 140, W, 60); }
  c.fillStyle = '#b8261c'; c.fillRect(1700, 140, 70, 90); txt(c, '印', 1735, 202, { size: 50, w: 900, align: 'center', color: '#efe8d8' });
});
// 3 浮世绘巨浪
world('wave', ['1831', '浮世绘的浪'], { col: '#f3ead8', line: '#1b2a4a', beak: '#e0a050', pouch: '#f0c890', lw: 7 }, (c, t) => {
  c.fillStyle = '#efe2c4'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#e8c8a0'; c.beginPath(); c.arc(1500, 300, 120, 0, 7); c.fill();
  const tt = t * .6;
  for (let layer = 0; layer < 3; layer++) { c.fillStyle = ['#1d3d6e', '#2a5a96', '#4a7ab8'][layer]; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 16) { const y = 560 + layer * 90 + 80 * Math.sin(x * .006 + tt + layer) + (layer === 0 ? -360 * Math.exp(-(((x - 520) / 260) ** 2)) : 0); c.lineTo(x, y); } c.lineTo(W, H); c.fill();
    c.strokeStyle = '#f3ead8'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= W; x += 16) { const y = 560 + layer * 90 + 80 * Math.sin(x * .006 + tt + layer) + (layer === 0 ? -360 * Math.exp(-(((x - 520) / 260) ** 2)) : 0) + 14; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.fillStyle = '#f3ead8'; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI; c.beginPath(); c.arc(520 + Math.cos(a + 3.3) * 200, 260 + Math.sin(a + 3.3) * 120, 16, 0, 7); c.fill(); }
});
// 4 星月夜的笔触
world('starry', ['1889', '旋涡的笔触'], { col: '#ffe66a', line: '#1a2a6a', beak: '#ff9a2a', pouch: '#ffd06a', lw: 7 }, (c, t) => {
  c.fillStyle = '#122a6a'; c.fillRect(0, 0, W, H); c.lineCap = 'round';
  for (let i = 0; i < 1600; i++) { const r = mulberry(i * 3 + 1); const x = r() * W, y = r() * H * .8; const a = Math.atan2(y - 380, x - 900) + Math.PI / 2 + noise3(x * .003, y * .003, t * .2) * 1.2; const l = 26;
    c.strokeStyle = r() < .2 ? '#f2d24a' : r() < .6 ? '#3a6ad0' : '#8ab0ff'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (const [x, y, r0] of [[1500, 200, 70], [400, 260, 50], [900, 380, 60]]) { c.fillStyle = '#ffe66a'; c.beginPath(); c.arc(x, y, r0, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,240,150,.6)'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, r0 * 1.5, 0, 7); c.stroke(); }
  c.fillStyle = '#0d1a3a'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, 880); for (let x = 0; x <= W; x += 30) c.lineTo(x, 880 - 30 * Math.sin(x * .01)); c.lineTo(W, H); c.fill();
});
// 5 呐喊的天空
world('scream', ['1893', '呐喊的天空'], { col: '#e8d8b0', line: '#3a1a0a', beak: '#3a1a0a', pouch: '#d8a060', lw: 7 }, (c, t) => {
  for (let y = 0; y < H; y += 10) { const k = y / H; c.fillStyle = `hsl(${lerp(5, 40, Math.sin(y * .02 + t * 2) * .5 + .5)},${85}%,${lerp(45, 60, k)}%)`; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= W; x += 40) c.lineTo(x, y + 20 * Math.sin(x * .004 + y * .01 + t)); c.lineTo(W, y + 30); c.lineTo(0, y + 30); c.fill(); }
  c.fillStyle = '#2a3a5a'; c.beginPath(); c.moveTo(0, 760); c.quadraticCurveTo(700, 600, W, 820); c.lineTo(W, H); c.lineTo(0, H); c.fill();
  c.strokeStyle = '#5a2a10'; c.lineWidth = 14; c.beginPath(); c.moveTo(0, 980); c.lineTo(W, 760); c.stroke();
});
// 6 诡盘
world('phen', ['1832', '诡盘'], { col: '#7a2e1c', line: '#3a1408', beak: '#c86a2a', pouch: '#e09050', lw: 7 }, (c, t) => {
  c.fillStyle = '#120a05'; c.fillRect(0, 0, W, H);
  if (!A1X.getDisc()) A1X.setDisc(A1X.makeDisc(440)); A1X.drawDisc(c, W * .7, H * .5, 440, (Math.floor(t * 30 + 1e-6) + .5) * Math.PI / 6, .04, 1);
});
// 7 默片
world('silent', ['1896', '默片'], { col: '#d8d0c0', line: '#1a1610', beak: '#5a5040', pouch: '#a89878', lw: 7 }, (c, t) => {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfc6b2'); g.addColorStop(.62, '#a79e8a'); g.addColorStop(.63, '#7d766a'); g.addColorStop(1, '#4f4a42'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#5d564b'; for (const [x, y, w] of [[0, 260, 380], [380, 200, 300], [680, 140, 560], [1240, 230, 300], [1540, 180, 380]]) c.fillRect(x, y, w, 680 - y);
}, (c, t, f) => { c.save(); c.globalCompositeOperation = 'color'; c.fillStyle = 'rgba(120,95,60,.4)'; c.fillRect(0, 0, W, H); c.restore(); A1X.filmLook(c, f, t); });
// 8 抽象
world('abstract', ['1910s', '抽象'], { col: '#e8b923', line: '#121212', beak: '#c8341f', pouch: '#1d3577', lw: 8 }, (c, t) => {
  c.fillStyle = '#efe6d2'; c.fillRect(0, 0, W, H);
  A1X.GEO.forEach((e, i) => { c.save(); c.scale(W / 1400, H / 1000); A1X.drawGeo(c, e, 1, t, { x: Math.sin(t * 2 + i) * 30, y: 0, s: 1, r: Math.sin(t + i) * .3 }); c.restore(); });
});
// 9 手绘胶片
world('lye', ['1935', '直接画在胶片上'], mono('#ffffff', 1.1), (c, t, f) => {
  c.fillStyle = '#0b0b0b'; c.fillRect(0, 0, W, H); const r = mulberry(Math.floor(t * 8) * 7 + 3);
  const cols = ['#ff3d2e', '#ffd23f', '#2ec4ff', '#ff6fd8', '#7dff6a']; for (let k = 0; k < 9; k++) { c.fillStyle = cols[Math.floor(r() * 5)]; c.globalAlpha = .8; c.fillRect(260 + r() * 1400, 0, 40 + r() * 220, H); } c.globalAlpha = 1;
  c.fillStyle = '#d8d0bc'; const off = (t * 900) % 120; for (let y = -120; y < H + 120; y += 120) { c.beginPath(); c.roundRect(70, y + off, 60, 70, 10); c.fill(); c.beginPath(); c.roundRect(W - 130, y + off, 60, 70, 10); c.fill(); }
});
// 10 谐波
world('harm', ['1958', '谐波'], mono('#ff7a4a', .9), (c, t) => {
  c.fillStyle = '#060202'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,90,54,.8)'; c.lineWidth = 2.5; c.beginPath();
  for (let i = 0; i < 900; i++) { const u = i / 40; const x = 1350 + Math.sin(3 * u + t) * Math.exp(-u * .03) * 380, y = 540 + Math.sin(2.01 * u) * Math.exp(-u * .03) * 380; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
}, (c) => { c.save(); c.globalAlpha = .1; c.fillStyle = '#000'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2); c.restore(); });
// 11 1982 线框
world('tron', ['1982', '线框'], { col: '#0a0a1a', line: '#6FD3FF', beak: '#ff5fd0', pouch: '#0a0a1a', lw: 6 }, (c, t) => { draw1982(c, { x: 0, y: 3.4, z: 10 + t * 8 }, t); });
// 12 噪声山脉
world('noise', ['1985', '噪声山脉'], { col: '#f0e6d0', line: '#1a1a1a', beak: '#e0a040', pouch: '#f0c070', lw: 7 }, (c, t) => {
  A2X.needOct(); const O = A2X.oct();
  c.drawImage(G540.run('field3d', { Q: 7, tex: O.s1, tex2: O.s2, U: { PIT: -.4, ALT: 13, AMP: 7, MODE: 4, REV: 1e4, CZ: 140 + t * 9, YAW: 0, LIT: 1, WIRE: 0 } }), 0, 0, W, H);
});
// 13 8-bit
world('pixel', ['1980s', '8-bit'], { col: '#ffffff', line: '#000000', beak: '#ff9a00', pouch: '#ffd800', lw: 14 }, (c, t) => {
  c.fillStyle = '#5c94fc'; c.fillRect(0, 0, W, H); c.fillStyle = '#00a800'; c.fillRect(0, 880, W, 200); c.fillStyle = '#c84c0c'; for (let x = 0; x < W; x += 80) for (let y = 880; y < H; y += 80) c.fillRect(x + 4, y + 4, 72, 72);
  c.fillStyle = '#fff'; for (const [x, y] of [[300, 200], [1200, 140], [1600, 260]]) { c.fillRect(x, y, 200, 60); c.fillRect(x + 40, y - 40, 120, 40); }
}, (c) => { PXx.imageSmoothingEnabled = true; PXx.drawImage(c.canvas, 0, 0, 240, 135); c.save(); c.imageSmoothingEnabled = false; c.drawImage(PXc, 0, 0, W, H); c.restore(); });
// 14 演示场景
world('demo', ['1990s', '演示场景'], { col: '#e0f4ff', line: '#ff2a9a', beak: '#2ec4ff', pouch: '#ffe14a', lw: 8 }, (c, t) => { c.drawImage(G540.run('demo', { T: t + 3, P: 0, S: 0 }), 0, 0, W, H); });
// 15 数据混合
world('mosh', ['2005', '数据混合'], P0, (c, t) => { c.drawImage(G540.run('warp', { T: t * 3 + 20, P: 0 }), 0, 0, W, H); },
  (c, t, f) => { const r = mulberry(f); for (let k = 0; k < 26; k++) { const x = Math.floor(r() * 60) * 32, y = Math.floor(r() * 34) * 32; c.drawImage(c.canvas, x, y, 32, 32, x + (r() - .3) * 90, y + r() * 120, 32, 32 + r() * 60); } });
// 16 蒸汽波
world('vapor', ['2010s', '蒸汽波'], { col: '#fff0ff', line: '#3a0a5a', beak: '#2ef0e0', pouch: '#ff8ad8', lw: 7 }, (c, t) => {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0a5a'); g.addColorStop(.55, '#ff6ac8'); g.addColorStop(.56, '#1a0a3a'); g.addColorStop(1, '#0a0420'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sg = c.createLinearGradient(0, 260, 0, 600); sg.addColorStop(0, '#ffe14a'); sg.addColorStop(1, '#ff3a8a'); c.fillStyle = sg; c.beginPath(); c.arc(1300, 600, 260, Math.PI, 0); c.fill();
  c.fillStyle = '#ff6ac8'; for (let k = 0; k < 6; k++) c.fillRect(1030, 470 + k * 24, 540, 6 + k);
  c.strokeStyle = '#2ef0e0'; c.lineWidth = 2; for (let k = -20; k <= 20; k++) { c.beginPath(); c.moveTo(W / 2 + k * 40, 605); c.lineTo(W / 2 + k * 260, H); c.stroke(); } for (let k = 0; k < 10; k++) { const y = 605 + Math.pow((k + (t * 2) % 1) / 10, 2) * 480; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
});
// 17 距离场
world('sdf', ['2013', '距离场'], { col: '#dfe6ee', line: '#38404a', beak: '#9aa6b4', pouch: '#c8d2dc', lw: 7 }, (c, t) => { c.drawImage(G540.run('sdf', { T: t + 2, P: 1, S: 0 }), 0, 0, W, H); });
// 18 扩散（示意）
world('diffuse', ['2024', '扩散模型（示意）'], P0, (c, t) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2a5a'); g.addColorStop(.6, '#f08a4b'); g.addColorStop(1, '#0d1a2a'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
  (c, t, f, l) => { const r = mulberry(f * 3); c.save(); c.globalAlpha = .55 * (1 - clamp(l / 1.1)); for (let k = 0; k < 2200; k++) { c.fillStyle = `rgb(${r() * 255},${r() * 255},${r() * 255})`; c.fillRect(r() * W, r() * H, 10, 10); } c.restore(); });
// 19 代码编辑器
world('editor', ['2026', '代码编辑器'], { col: '#f4f1ea', line: '#1d2430', beak: '#f2a33a', pouch: '#f7c46b', lw: 8 }, (c, t) => {
  c.fillStyle = '#16181f'; c.fillRect(0, 0, W, H); c.fillStyle = '#1e2129'; c.fillRect(0, 0, 640, H);
  const src = pelican.toString().split('\n').slice(0, 30);
  src.forEach((l, i) => { txt(c, String(i + 1).padStart(3), 20, 70 + i * 34, { size: 22, font: FONT.mono, color: '#556' }); txt(c, l.slice(0, 44), 80, 70 + i * 34, { size: 22, font: FONT.mono, color: '#c8ccd8' }); });
  c.fillStyle = '#e9e4d8'; c.fillRect(700, 60, W - 760, H - 120);
});
const TW = { t0: GP('twenty frames')[0], beat: 60 / 99.4 * 2 };
// 编辑器那一格：鹈鹕放在右边空白画板（x 700–1860，y 60–1020）的正中
const PEL_AT = { editor: [1268, 774, .9] };
function renderWorld(c, k, t, f, lt) {
  const w = WORLDS[k]; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  w.bg(c, t);
  const [px, py, ps] = PEL_AT[w.name] || [PEL_X, PEL_Y, PEL_S];
  pelican(c, px, py, ps, Object.assign({ ph: t * 9 }, P0, w.pel));
  if (w.post) w.post(c, t, f, lt);
}
shot(TW.t0, GP('twenty frames')[1], {
  grain: .035,
  draw(ctx, lt, t, f) {
    const k = Math.min(19, Math.floor(lt / TW.beat)), l = lt - k * TW.beat;
    const wipe = 0.26; // 画框边从右扫到左
    renderWorld(WAx, k, t, f, l);
    if (l < wipe && k > 0) {
      renderWorld(WBx, k - 1, t, f, l + TW.beat);
      const x = lerp(W + 60, -60, ease.inout(l / wipe));
      ctx.drawImage(WA, 0, 0); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(WB, 0, 0); ctx.restore();
      // 画框
      ctx.save(); const g = ctx.createLinearGradient(x - 40, 0, x + 40, 0); g.addColorStop(0, '#5a3a14'); g.addColorStop(.5, '#e8c070'); g.addColorStop(1, '#5a3a14'); ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 80, H); ctx.restore();
    } else ctx.drawImage(WA, 0, 0);
    // 镜头跟着冲：轻微推进
    const [era, name] = WORLDS[k].era;
    eraTag(ctx, era, name, sstep(.05, .2, l), ['rock', 'song', 'wave', 'abstract', 'pixel', 'silent'].includes(WORLDS[k].name));
    this.tag = WORLDS[k].src.replace('cold.js', 'cold.js');
    flash(ctx, l < .05 && k > 0 ? .25 : 0);
  }
});

// ---------- 撞进代码编辑器：一行行写出鹈鹕 ----------
const ED = { t0: GP('twenty frames')[1], code: LS(7), edit: GP('edit number')[0], deflate: GP('deflate')[0], feather: LS(11), prev: LS(12), title: GP('title')[0] };
const CODE = ['pelican(ctx, x, y, s, {', '  ph:    t * 6,      // 脚踏', '  wheel: 1.0,        // 车轮', '  col:   "#f4f1ea",  // 羽毛', '  beak:  "#f2a33a",', '});'];
function wheelAt(t) {
  if (t < ED.edit + .5) return 1;
  if (t < ED.deflate) { const l = t - ED.edit - .5; return 1 + 2 * (1 - Math.exp(-l * 5) * Math.cos(l * 14)); }
  const l = t - ED.deflate; return 1 + 2 * Math.max(0, 1 - l / .35) * (1 + .1 * Math.sin(l * 40));
}
shot(ED.t0, ED.title, {
  grain: .03,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#14161c'; ctx.fillRect(0, 0, W, H);
    const frozen = t < LS(7) - .2;
    if (frozen) { // 定住的那一帧：鹈鹕一头撞进编辑器
      renderWorld(ctx, 19, ED.t0, 0, 0); ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(0,0,0,${sstep(0, .5, lt) * .8})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      return;
    }
    // 编辑器：左边代码，右边画布
    ctx.fillStyle = '#1b1e26'; ctx.fillRect(0, 0, 820, H); ctx.fillStyle = '#e9e4d8'; ctx.fillRect(880, 120, 980, 760);
    let code = CODE.slice(); const w = wheelAt(t);
    const editing = t > ED.edit - .3 && t < ED.deflate + .6;
    if (t > ED.edit) { const v = t < ED.deflate ? '3.0' : '1.0'; code[2] = `  wheel: ${v},        // 车轮`; }
    const typed = clamp((t - ED.code) / 4.5);
    codeBox(ctx, code, 40, 220, typed * 40, { size: 32, rate: 40 * 1.0 / 1, w: 760, hl: editing ? 2 : null, hlc: '#FFE14A' });
    txt(ctx, 'pelican.js', 60, 170, { size: 30, font: FONT.mono, color: 'rgba(233,228,216,.6)' });
    // 一笔笔画出来
    ctx.save(); ctx.beginPath(); ctx.rect(880, 120, 980, 760); ctx.clip();
    const draw = clamp((t - ED.code) / 5.5);
    ctx.setLineDash([2600 * draw, 3000]);
    const zf = ease.inout((t - ED.feather) / 4.0) * (1 - sstep(ED.prev + 1, ED.prev + 2.5, t)); // 推近羽毛
    ctx.translate(1370, 700); ctx.scale(1 + zf * 3.2, 1 + zf * 3.2); ctx.translate(-1370 + zf * 60, -700 + zf * 90);
    pelican(ctx, 1370, 820, .72, { ph: t * 6, wheel: w, col: '#f4f1ea', line: '#1d2430', lw: 8, fill: draw > .95 });
    ctx.restore();
    // 噪声从羽毛边缘渗进来
    if (zf > .3) { const r = mulberry(Math.floor(t * 30)); ctx.save(); ctx.beginPath(); ctx.rect(880, 120, 980, 760); ctx.clip(); ctx.globalAlpha = sstep(.5, 1, zf) * .5; for (let k = 0; k < 900; k++) { const x = 880 + r() * 980, y = 120 + r() * 760; const e = Math.abs(noise3(x * .01, y * .01, t * .5)); if (e < .12) { ctx.fillStyle = `rgba(${r() * 255},${r() * 255},${r() * 255},.8)`; ctx.fillRect(x, y, 4, 4); } } ctx.restore(); }
    // 参数编辑的提示
    if (t > ED.edit && t < ED.deflate + .8) txt(ctx, t < ED.deflate ? 'wheel = 3.0' : 'wheel = 1.0', 1370, 200, { size: 48, font: FONT.mono, align: 'center', color: '#c8341f', alpha: 1 });
    // 开源与 SKILL
    const l10 = t - LS(10); if (l10 > 0 && t < LE(10) + .5) { const a = sstep(0, .4, l10) * (1 - sstep(LE(10) - LS(10), LE(10) - LS(10) + .5, l10)); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(242,196,109,.15)'; ctx.fillRect(40, 640, 760, 150); ctx.restore(); txt(ctx, '代码全部开源 · 附本片 SKILL', 70, 700, { size: 40, color: '#FFE7A8', alpha: a }); txt(ctx, '地址在简介区', 70, 760, { size: 36, color: 'rgba(255,231,168,.75)', alpha: a }); }
    // 预览窗：黑的，只闪出一张静帧
    const pa = sstep(ED.prev, ED.prev + .3, t);
    if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.fillStyle = '#000'; ctx.fillRect(1400, 150, 420, 236); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.strokeRect(1400, 150, 420, 236); ctx.restore(); txt(ctx, '预览', 1400, 136, { size: 36, color: 'rgba(255,255,255,.6)', alpha: pa });
      const fl = t - (ED.prev + 2.2); if (fl > 0 && fl < .5 && window.COLD_TC) ctx.drawImage(window.COLD_TC, 1400, 150, 420, 236); }
    fadeBlack(ctx, sstep(ED.title - .5, ED.title, t) * 0);
  }
});

// ---------- 片名：鹈鹕骑出画面，带起的风把流线卷成「写出来的影像」 ----------
const title6 = {
  n: 22000, K: 70, cv: null, cx: null,
  init() {
    if (!this.P) {
      const [tx, ty] = textPoints([{ s: '写出来的影像', size: 210, y: 470 }], this.n, 5); const K = this.K, N = this.n;
      this.P = new Float32Array(N * K * 2); const r = mulberry(21); this.dl = new Float32Array(N); this.col = new Uint8Array(N);
      const s = 0.0018, e = 2;
      for (let i = 0; i < N; i++) {
        let x = tx[i], y = ty[i]; this.dl[i] = 1.0 + r() * 1.4; this.col[i] = Math.floor(r() * 3);
        for (let k = 0; k < K; k++) {
          this.P[(i * K + k) * 2] = x; this.P[(i * K + k) * 2 + 1] = y;
          const A = noise3(x * s, (y + e) * s, 3.3), B = noise3(x * s, (y - e) * s, 3.3), Cc = noise3((x + e) * s, y * s, 3.3), D = noise3((x - e) * s, y * s, 3.3);
          let vx = (A - B), vy = -(Cc - D); const l = Math.hypot(vx, vy) + 1e-9; x -= vx / l * (6 + k * 0.35) + 3; y -= vy / l * (6 + k * 0.35);
        }
      }
      [this.cv, this.cx] = mk2d();
    }
    this.cx.fillStyle = '#070A12'; this.cx.fillRect(0, 0, W, H);
  },
  pos(i, lt) { const K = this.K, u = clamp((lt - this.dl[i]) / 1.9); const sp = (1 - ease.out(u)) * (K - 1); const k = Math.floor(sp), fr = sp - k, b = (i * K + k) * 2, b2 = (i * K + Math.min(K - 1, k + 1)) * 2; return [lerp(this.P[b], this.P[b2], fr), lerp(this.P[b + 1], this.P[b2 + 1], fr), u]; },
  step(f, lt) {
    const c = this.cx; c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(7,10,18,0.14)'; c.fillRect(0, 0, W, H);
    const cols = ['rgba(242,196,109,0.8)', 'rgba(255,236,200,0.75)', 'rgba(255,165,85,0.7)'], prev = lt - 1 / FPS; c.lineWidth = 1.3; c.lineCap = 'round';
    for (let b = 0; b < 3; b++) { c.strokeStyle = cols[b]; c.beginPath();
      for (let i = 0; i < this.n; i++) { if (this.col[i] !== b) continue; const p1 = this.pos(i, lt); if (p1[2] <= 0) continue; const p0 = this.pos(i, Math.max(prev, this.dl[i])); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0] + 0.01, p1[1]); }
      c.stroke(); }
  }
};
const TI = { t0: GP('title')[0], t1: CO[2] };
shot(TI.t0, TI.t1, {
  flow: title6, grain: .04, bloom: .45, bthr: .35, tag: false,
  draw(ctx, lt, t, f) {
    syncState(this, f); ctx.drawImage(title6.cv, 0, 0);
    // 鹈鹕骑出画面
    const px = lerp(PEL_X - 300, W + 500, ease.in(lt / 1.6));
    if (lt < 1.7) pelican(ctx, px, PEL_Y, .5, { ph: t * 12, col: '#ffffff', lw: 8 });
    const a = sstep(3.0, 3.8, lt);
    ctx.save(); ctx.globalAlpha = a; txt(ctx, '写出来的影像', W / 2, 470, { size: 210, w: 900, align: 'center', base: 'middle', color: '#FFE7B8', shadow: 'rgba(242,196,109,0.6)', blur: 40 }); ctx.restore();
    txt(ctx, '一帧没拍 · 没用视频生成 · 每一帧都是代码', W / 2, 690, { size: 44, align: 'center', color: C.cream, alpha: sstep(3.6, 4.3, lt) * (1 - sstep(6.2, 6.9, lt)), ls: 6 });
    txt(ctx, 'EVERY FRAME IS WRITTEN', W / 2, 760, { size: 30, align: 'center', font: FONT.grot, color: 'rgba(242,196,109,0.85)', alpha: sstep(3.9, 4.5, lt) * (1 - sstep(6.2, 6.9, lt)), ls: 14 });
    fadeBlack(ctx, sstep(6.4, 7.0, lt));
  }
});
// 冷开场里闪一下文字之城（0.5 秒）：用文字之城的第一帧
for (const s of SHOTS) if (s.a === ED.t0) { const old = s.init; s.init = () => { try { if (!window.COLD_TC) { TC.init(); TC.plan(); const c = TC.render(30); const [cv, cx] = mk2d(); cx.drawImage(c, 0, 0); window.COLD_TC = cv; } } catch (e) { } if (old) old(); }; }
window.COLDX = { WORLDS, renderWorld, PEL_X, PEL_Y, PEL_S };
})();
