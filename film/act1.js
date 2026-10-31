// ===== 第一幕 手工时代（1829–1935） =====
(() => {
const A1 = SEG('a1');
const PAPER = '#efe4cc', SEPIA = '#2a1d10', INK = '#140d06';

// ---------- 幕卡：纸 + 墨 ----------
shot(A1[1], A1[1] + 3, {
  tag: false, grain: .07,
  draw(ctx, lt) {
    actCard(ctx, lt, 3, { n: '第 一 幕', name: '手工时代', years: '1829 — 1935', bg: '#120c06', fg: PAPER, accent: '#d9a45a',
      under(c, lt) { const g = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100); g.addColorStop(0, 'rgba(120,80,40,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); } });
  }
});

// ---------- 普拉托：盯着太阳 25 秒 ----------
const SUN = { t0: A1[1] + 3, cut: LE(13) - 1.2 };
shot(SUN.t0, LS(14) - 0.3, {
  bloom: .8, bthr: .25, grain: .06,
  draw(ctx, lt, t) {
    if (t < SUN.cut) {
      const p = (t - SUN.t0) / (SUN.cut - SUN.t0);
      const g = ctx.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, 1300);
      const R = lerp(.08, .22, ease.inout(p));
      g.addColorStop(0, '#ffffff'); g.addColorStop(R, '#fffbe8'); g.addColorStop(R * 1.6, '#ffd88a'); g.addColorStop(R * 3.2, '#c8742a'); g.addColorStop(1, '#2a1206');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 光芒
      ctx.save(); ctx.translate(W / 2, H * .46); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283 + lt * 0.05; ctx.rotate(6.283 / 18); ctx.fillStyle = `rgba(255,220,150,${0.05 + 0.03 * Math.sin(lt * 2 + k)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -40); ctx.lineTo(1400, 40); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = `rgba(255,255,255,${.6 * p * p})`; ctx.fillRect(0, 0, W, H);
      const sec = Math.min(25, Math.floor(p * 26));
      txt(ctx, `00:${String(sec).padStart(2, '0')}`, W / 2, 210, { size: 70, font: FONT.mono, align: 'center', color: 'rgba(80,40,10,.85)', alpha: sstep(0.05, 0.15, p) });
      eraTag(ctx, '1829', '比利时 · 普拉托', sstep(.0, .1, p) * (1 - sstep(.5, .6, p)), true);
    } else {
      // 残影：反色、漂移、变色、散开
      const l = t - SUN.cut; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const hue = 190 + l * 40, a = Math.max(0, 1 - l / 3.2);
      const x = W / 2 + l * 30, y = H * .46 + l * 12, r = 160 + l * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `hsla(${hue},80%,60%,${.85 * a})`); g.addColorStop(.6, `hsla(${hue + 40},70%,40%,${.4 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      flash(ctx, 1 - l / 0.15);
    }
  }
});

// ---------- 诡盘：缝就是快门 ----------
let DISC = null;
function bird(c, x, y, s, ph, col) { // 原创小鹈鹕，拍翅 12 帧
  const fl = Math.sin(ph * Math.PI * 2);
  c.save(); c.translate(x, y + fl * s * .12); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round';
  c.beginPath(); c.ellipse(0, 0, .55, .3, -.1, 0, 7); c.fill();                      // 身体
  c.beginPath(); c.arc(.48, -.32, .17, 0, 7); c.fill();                               // 头
  c.beginPath(); c.moveTo(.6, -.36); c.lineTo(1.25, -.2); c.quadraticCurveTo(.85, .05, .58, -.18); c.fill(); // 喙和喉囊
  // 翅膀：填充的弯刀形（肩在身体上方，翅尖随拍翅上下），再压一道羽毛分界线
  const tx = -.98 + Math.abs(fl) * .08, ty = -.3 - fl * 1.0;
  c.beginPath(); c.moveTo(.2, -.2);
  c.quadraticCurveTo(-.25, -.5 - fl * .55, tx, ty);
  c.quadraticCurveTo(-.62, -.16 - fl * .42, -.42, -.04);
  c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-.38, -.04); c.lineTo(-.92, .14); c.lineTo(-.5, .2); c.closePath(); c.fill(); // 尾
  c.save(); c.globalAlpha *= .35; c.strokeStyle = '#000'; c.lineWidth = .035; c.beginPath(); c.moveTo(.05, -.22); c.quadraticCurveTo(-.32, -.36 - fl * .4, tx * .75, ty * .72 - .05); c.stroke(); c.restore();
  c.restore();
}
function makeDisc(R) {
  const [cv, c] = mk2d(R * 2 + 20, R * 2 + 20); c.translate(R + 10, R + 10);
  c.fillStyle = '#e8d8b4'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
  c.strokeStyle = '#5a3c1e'; c.lineWidth = 8; c.stroke();
  for (let ring = 0; ring < 3; ring++) { c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * (.32 + ring * .2), 0, 7); c.stroke(); }
  for (let k = 0; k < 12; k++) {
    c.save(); c.rotate(k * Math.PI / 6);
    c.fillStyle = '#120a04'; c.fillRect(-8, -R + 6, 16, R * .17);                 // 缝
    bird(c, 0, -R * .6, R * .15, k / 12, '#7a2e1c'); // 12 只鸟各差一格拍翅
    c.save(); c.translate(0, -R * .28); c.fillStyle = '#2d4a7a'; const s = 1 + .35 * Math.sin(k / 12 * 6.283); c.beginPath(); c.arc(0, 0, R * .045 * s, 0, 7); c.fill(); c.restore();
    c.restore();
  }
  c.fillStyle = '#5a3c1e'; c.beginPath(); c.arc(0, 0, R * .07, 0, 7); c.fill();
  return cv;
}
function drawDisc(ctx, x, y, R, ang, slit, sub = 10) {
  const n = Math.floor(ang / (Math.PI / 6)), base = n * Math.PI / 6;
  for (let j = 0; j < sub; j++) {
    const d = ((j + .5) / sub - .5) * slit * Math.PI / 6 * 1.0 + (ang - base) * slit;
    ctx.save(); ctx.globalAlpha = j === 0 ? 1 : 1 / (j + 1); ctx.translate(x, y); ctx.rotate(base + d); ctx.drawImage(DISC, -R - 10, -R - 10); ctx.restore();
  }
}
const PH = { t0: LS(14) - 0.3, dark0: LS(15), black: LS(18) + 0.3 };
shot(PH.t0, GP('silent film')[0], {
  grain: .07, bloom: .25, bthr: .5,
  init() { DISC = makeDisc(440); },
  draw(ctx, lt, t) {
    ctx.fillStyle = '#100a05'; ctx.fillRect(0, 0, W, H);
    const tune = GP('slit tune'); const slit = t < tune[0] ? 1 : lerp(1, 0.04, ease.inout((t - tune[0]) / (tune[1] - tune[0])));
    const ang = (Math.floor(lt * 30 + 1e-6) + .5) * Math.PI / 6; const sc = 1 + lt * 0.006;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    drawDisc(ctx, W / 2 - 120, H / 2, 440, ang, slit, slit > .1 ? 12 : 1);
    ctx.restore();
    // 镜框
    ctx.save(); ctx.strokeStyle = 'rgba(200,160,100,.35)'; ctx.lineWidth = 3; ctx.strokeRect(W / 2 - 640, 40, 1040, 1000); ctx.restore();
    codeBox(ctx, [`slitWidth = ${slit.toFixed(2)}`], 1290, 330, 9, { size: 36, rate: 999 });
    txt(ctx, slit > .5 ? '缝太宽：一团模糊' : slit > .1 ? '……' : '缝够窄：画动了', 1300, 470, { size: 40, color: '#e9dcc0', alpha: sstep(1, 2, lt) * (1 - sstep(PH.dark0 - PH.t0 - .4, PH.dark0 - PH.t0, lt)) });
    eraTag(ctx, '1832', '诡盘 Phénakistiscope', sstep(.3, 1, lt) * (1 - sstep(6, 7, lt)));
    // 失明：一点点暗下去
    const dk = sstep(PH.dark0, PH.black, t);
    if (dk > 0) {
      const g = ctx.createRadialGradient(W / 2 - 120, H / 2, lerp(900, 10, dk), W / 2 - 120, H / 2, lerp(1300, 200, dk));
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      fadeBlack(ctx, dk * .85);
    }
    const l16 = t - LS(16); stamp(ctx, '据记载', '失明原因见当时记载', 1560, 700, sstep(0.3, .7, l16) * (1 - sstep(4.6, 5.2, l16)));
    // 只剩一道缝透光 → 拉长成画框边
    if (t > PH.black - .5) {
      const l = t - PH.black, grow = ease.inout((t - GP('slit to frame')[0]) / 2.4);
      fadeBlack(ctx, sstep(-.5, 0, l));
      const a = sstep(-.2, .6, l);
      const hgt = lerp(70, H, grow), x = lerp(W / 2 - 120, 230, grow);
      const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0); g.addColorStop(0, 'rgba(255,230,180,0)'); g.addColorStop(.5, `rgba(255,240,210,${a})`); g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 30, H / 2 - hgt / 2, 60, hgt);
      if (grow > 0) { ctx.fillStyle = `rgba(255,240,210,${a * grow})`; ctx.fillRect(W - x - 3, H / 2 - hgt / 2, 6, hgt); }
    }
  }
});

// ---------- 梅里爱：一部默片 ----------
function filmLook(ctx, f, t, amt = 1) {
  const r = mulberry(f * 31 + 7);
  // 闪烁
  ctx.fillStyle = `rgba(0,0,0,${(0.05 + 0.08 * r()) * amt})`; ctx.fillRect(0, 0, W, H);
  // 划痕
  ctx.save(); ctx.strokeStyle = `rgba(255,250,235,${0.35 * amt})`; ctx.lineWidth = 1.5;
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { const x = r() * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (r() - .5) * 20, H); ctx.stroke(); }
  // 灰尘
  ctx.fillStyle = `rgba(20,14,8,${0.6 * amt})`; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 1 + r() * 4, 1 + r() * 7, r() * 3, 0, 7); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.75 * amt})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function titleCard(ctx, lines, a = 1) {
  ctx.fillStyle = '#0b0906'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 4; ctx.strokeRect(260, 170, W - 520, H - 340); ctx.lineWidth = 1.5; ctx.strokeRect(282, 192, W - 564, H - 384);
  // 角花
  for (const [x, y, sx, sy] of [[282, 192, 1, 1], [W - 282, 192, -1, 1], [282, H - 192, 1, -1], [W - 282, H - 192, -1, -1]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.beginPath(); ctx.moveTo(0, 90); ctx.bezierCurveTo(10, 30, 30, 10, 90, 0); ctx.moveTo(18, 60); ctx.bezierCurveTo(30, 40, 40, 30, 60, 18); ctx.stroke();
    ctx.beginPath(); ctx.arc(34, 34, 8, 0, 7); ctx.stroke(); ctx.restore();
  }
  lines.forEach((s, i) => txt(ctx, s, W / 2, H / 2 + (i - (lines.length - 1) / 2) * 110 + 30, { size: s.length > 9 ? 76 : 92, w: 700, align: 'center', color: '#efe6d0', ls: 8 }));
  ctx.restore();
}
function street(ctx, tt, mode, frozen) {
  // 巴黎街景剪影（原创）。mode: 0 公共马车, 1 灵车
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfc6b2'); g.addColorStop(.62, '#a79e8a'); g.addColorStop(.63, '#7d766a'); g.addColorStop(1, '#4f4a42'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 建筑
  ctx.fillStyle = '#5d564b';
  const bx = [[0, 260, 380], [380, 200, 300], [680, 140, 560], [1240, 230, 300], [1540, 180, 380]];
  for (const [x, y, w] of bx) { ctx.fillRect(x, y, w, 680 - y); ctx.fillStyle = '#4a443b'; for (let wx = x + 30; wx < x + w - 40; wx += 70) for (let wy = y + 50; wy < 600; wy += 110) ctx.fillRect(wx, wy, 34, 60); ctx.fillStyle = '#5d564b'; }
  // 歌剧院式的穹顶（原创简化）
  ctx.beginPath(); ctx.ellipse(960, 140, 160, 90, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(940, 20, 40, 40);
  // 路灯
  ctx.strokeStyle = '#2f2b25'; ctx.lineWidth = 8; for (const x of [300, 1620]) { ctx.beginPath(); ctx.moveTo(x, 900); ctx.lineTo(x, 520); ctx.stroke(); ctx.fillStyle = '#2f2b25'; ctx.fillRect(x - 22, 490, 44, 40); }
  // 行人
  ctx.fillStyle = '#26221d';
  for (let k = 0; k < 7; k++) { const sp = 60 + k * 23, x = ((k * 397 + tt * sp * (k % 2 ? 1 : -1)) % 2200 + 2200) % 2200 - 140, y = 760 + (k % 3) * 40; const st = Math.sin(tt * 6 + k) * 14;
    ctx.fillRect(x - 14, y - 150, 28, 90); ctx.beginPath(); ctx.arc(x, y - 168, 17, 0, 7); ctx.fill(); ctx.fillRect(x - 15, y - 205, 30, 26); ctx.fillRect(x - 24, y - 182, 48, 6);
    ctx.save(); ctx.lineWidth = 9; ctx.strokeStyle = '#26221d'; ctx.beginPath(); ctx.moveTo(x, y - 62); ctx.lineTo(x + st, y); ctx.moveTo(x, y - 62); ctx.lineTo(x - st, y); ctx.stroke(); ctx.restore(); }
  // 马车
  const cx = frozen != null ? frozen : CX(tt);
  carriage(ctx, cx, 860, mode, tt);
}
const CX = tt => -700 + tt * 221;
function carriage(ctx, x, y, mode, tt) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#1d1a16'; ctx.strokeStyle = '#1d1a16';
  // 马
  const leg = Math.sin(tt * 9) * 18;
  ctx.beginPath(); ctx.ellipse(260, -120, 95, 45, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(330, -150); ctx.lineTo(380, -230); ctx.lineTo(410, -215); ctx.lineTo(360, -130); ctx.fill();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(200, -90); ctx.lineTo(200 + leg, 0); ctx.moveTo(320, -90); ctx.lineTo(320 - leg, 0); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(150, -110); ctx.lineTo(200, -120); ctx.stroke();
  if (mode === 0) { // 公共马车：双层、窗
    ctx.fillRect(-260, -300, 410, 230); ctx.fillStyle = '#a79e8a'; for (let k = 0; k < 4; k++) ctx.fillRect(-235 + k * 95, -270, 70, 80); ctx.fillStyle = '#1d1a16';
    ctx.fillRect(-270, -330, 430, 16); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-220 + k * 90, -350, 14, 0, 7); ctx.fill(); }
  } else { // 灵车：黑色、羽饰
    ctx.fillRect(-240, -280, 380, 210); ctx.fillStyle = '#3a352e'; ctx.fillRect(-200, -250, 300, 140); ctx.fillStyle = '#1d1a16';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-210 + k * 110, -310, 14, 34, 0, 0, 7); ctx.fill(); }
  }
  ctx.lineWidth = 6; for (const wx of [-190, 80]) { ctx.beginPath(); ctx.arc(wx, -40, 48, 0, 7); ctx.stroke(); for (let s = 0; s < 6; s++) { const a = s / 6 * 6.283 + tt * 4; ctx.beginPath(); ctx.moveTo(wx, -40); ctx.lineTo(wx + Math.cos(a) * 48, -40 + Math.sin(a) * 48); ctx.stroke(); } }
  ctx.restore();
}
const MF = { t0: GP('silent film')[0] };
shot(MF.t0, GP('paper stage')[0], {
  grain: .1, tag: false,
  draw(ctx, lt, t, f) {
    const l = Math.floor(lt * 16) / 16; // 16 格/秒
    const jx = (mulberry(Math.floor(lt * 16))() - .5) * 6, jy = (mulberry(Math.floor(lt * 16) + 99)() - .5) * 6;
    ctx.save(); ctx.translate(jx, jy);
    const seq = [[0, 3, 'card', ['约 1896 年', '巴黎，歌剧院广场']], [3, 8.5, 'st0'], [8.5, 11, 'card', ['摄影机', '卡住了']], [11, 12.2, 'freeze'], [12.2, 14.6, 'card', ['修好', '接着拍']], [14.6, 17.4, 'st1'], [17.4, 19.8, 'card', ['放映时——']], [19.8, 30.5, 'play']];
    const cur = seq.find(s => lt >= s[0] && lt < s[1]) || seq[seq.length - 1]; const ll = lt - cur[0];
    if (cur[2] === 'card') titleCard(ctx, cur[3], sstep(0, .25, ll));
    else if (cur[2] === 'st0') street(ctx, l, 0);
    else if (cur[2] === 'freeze') { street(ctx, 8.4, 0, CX(8.4)); ctx.fillStyle = `rgba(0,0,0,${ll > .8 ? .85 : 0})`; ctx.fillRect(0, 0, W, H); }
    else if (cur[2] === 'st1') street(ctx, l + 6, 1, CX(8.4) + (l - 14.6 + 0) * 0 + ll * 300);
    else { // 放映：马车在同一个位置跳成灵车，然后倒回去慢放
      const X = CX(8.4);
      let tt, mode, x;
      if (ll < 3) { tt = 5.4 + ll; x = CX(5.4 + ll); mode = 0; if (ll > 3 - 0.06) { mode = 1; } }
      else if (ll < 3.9) { const r = (ll - 3) / .9; tt = 8.4 - r * 1.2; x = CX(tt); mode = 0; }
      else if (ll < 8.2) { const s = (ll - 3.9) / 4.3; tt = 7.2 + s * 2.4; mode = tt < 8.4 ? 0 : 1; x = tt < 8.4 ? CX(tt) : X + (tt - 8.4) * 300; }
      else { tt = 9.6 + (ll - 8.2); mode = 1; x = X + (tt - 8.4) * 300; }
      street(ctx, Math.floor(tt * 16) / 16, mode, x);
      if (ll > 3.9 && ll < 9.6) { const a = sstep(4.0, 4.4, ll); ctx.save(); ctx.strokeStyle = `rgba(200,40,30,${a})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(X - 40, 640, 420, 300, 0, 0, 7); ctx.stroke(); ctx.restore();
        txt(ctx, mode === 0 ? '公共马车' : '灵车', X - 40, 290, { size: 64, w: 700, align: 'center', color: '#c8281e', alpha: a }); }
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = 'rgba(120,95,60,.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    filmLook(ctx, f, lt);
    eraTag(ctx, '约 1896', '梅里爱', sstep(3, 3.5, lt) * (1 - sstep(7.5, 8.3, lt)));
  }
});

// ---------- 纸板舞台：按拍变魔术 ----------
function paperShape(c, kind, x, y, s, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 14; c.shadowOffsetX = 8; c.shadowOffsetY = 10;
  if (kind === 'hat') { c.fillStyle = '#1b1714'; c.fillRect(-60, -150, 120, 140); c.fillRect(-100, -20, 200, 24); c.fillStyle = '#8c1f1a'; c.fillRect(-60, -50, 120, 18); }
  else if (kind === 'star') { c.fillStyle = '#e8b923'; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 40 : 95, a = k / 10 * 6.283 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); }
  else if (kind === 'moon') { c.fillStyle = '#efe0b0'; c.beginPath(); c.arc(0, 0, 110, 0, 7); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(50, -20, 100, 0, 7); c.fill(); }
  else if (kind === 'bird') { bird(c, 0, 0, 120, 0.2, '#efe6d6'); }
  c.restore();
}
shot(GP('paper stage')[0], GP('dusk')[0], {
  grain: .07, xin: .4,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#1a0f08'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 520, 50, W / 2, 520, 900); g.addColorStop(0, '#3b5a7a'); g.addColorStop(1, '#0e1824'); ctx.fillStyle = g; ctx.fillRect(260, 140, W - 520, 740);
    // 纸板星空
    for (let k = 0; k < 30; k++) { const r = mulberry(k + 5); ctx.fillStyle = 'rgba(240,225,180,.6)'; ctx.beginPath(); ctx.arc(300 + r() * (W - 600), 170 + r() * 400, 2 + r() * 3, 0, 7); ctx.fill(); }
    // 按拍（音乐节拍）切换：消失、出现、分身
    const [bi] = beatIdx(t); const k = Math.max(0, bi);
    const scene = Math.floor(k / 2) % 6;
    const layouts = [[['hat', 960, 700, 1]], [['hat', 760, 700, 1], ['hat', 1160, 700, 1]], [['hat', 560, 700, .9], ['hat', 960, 700, .9], ['hat', 1360, 700, .9]], [['moon', 1400, 330, 1], ['bird', 760, 560, 1]], [['star', 600, 330, .8], ['star', 1320, 300, .7], ['bird', 960, 600, 1.2]], [['moon', 960, 360, 1.2], ['hat', 960, 760, 1]]];
    for (const [kind, x, y, s] of layouts[scene]) paperShape(ctx, kind, x, y + Math.sin(lt * 2 + x) * 6, s, Math.sin(lt * 1.3 + x) * .04);
    // 烟：每次变的那一拍
    const [, since] = beatIdx(t); if (since < .25 && k % 2 === 0) { ctx.save(); ctx.globalAlpha = 1 - since / .25; for (let j = 0; j < 14; j++) { const r = mulberry(k * 17 + j); ctx.fillStyle = 'rgba(240,235,225,.55)'; ctx.beginPath(); ctx.arc(700 + r() * 520, 520 + r() * 260, 40 + r() * 70 * (1 + since * 3), 0, 7); ctx.fill(); } ctx.restore(); }
    // 台口与幕布
    const open = 1 - ease.inout((t - (GP('dusk')[0] - 1.6)) / 1.6) * 0 ;
    const close = ease.inout((t - (GP('dusk')[0] - 1.4)) / 1.2);
    ctx.fillStyle = '#7a1414';
    const cw = lerp(260, W / 2, close);
    for (const side of [0, 1]) { ctx.save(); if (side) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.fillRect(0, 0, cw, H);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 20; x < cw; x += 60) ctx.fillRect(x, 0, 18, H); ctx.fillStyle = '#7a1414'; ctx.restore(); }
    ctx.fillStyle = '#5a0e0e'; ctx.fillRect(0, 0, W, 140); ctx.fillStyle = '#c8a050'; ctx.fillRect(0, 132, W, 8); ctx.fillStyle = '#2a1a0e'; ctx.fillRect(0, 880, W, 200); ctx.fillStyle = '#c8a050'; ctx.fillRect(0, 880, W, 6);
    const l20 = t - LS(20); stamp(ctx, '本人讲述', null, 1580, 300, sstep(.4, .8, l20) * (1 - sstep(5.5, 6.2, l20)));
    if (t < LS(20)) fadeBlack(ctx, 0);
  }
});

// ---------- 康定斯基：侧放的画 ----------
let KAND = null;
const KE = []; // 画里的元素：具象形态 ↔ 几何形态
function brushStroke(c, pts, w, col, r, jit = 6) {
  c.save(); c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let pass = 0; pass < 5; pass++) { c.globalAlpha = .2; c.lineWidth = w * (0.5 + r() * .9); c.beginPath(); pts.forEach((p, i) => { const x = p[0] + (r() - .5) * jit, y = p[1] + (r() - .5) * jit; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
  c.restore();
}
function makeKand() {
  // 原创的风景：山、骑马的人影、太阳、红色山丘、树；画布 1400×1000（横）
  const [cv, c] = mk2d(1400, 1000); const r = mulberry(1910);
  c.fillStyle = '#e9dcbc'; c.fillRect(0, 0, 1400, 1000);
  const blob = (x, y, rx, ry, col, n = 60) => { for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()); brushStroke(c, [[x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d], [x + Math.cos(a) * rx * d + (r() - .5) * 80, y + Math.sin(a) * ry * d + (r() - .5) * 40]], 26, col, r, 4); } };
  // 天空
  for (let i = 0; i < 520; i++) { const y = r() * 560, x = r() * 1400; const q = r(); brushStroke(c, [[x, y], [x + 40 + r() * 90, y + (r() - .5) * 40], [x + 90 + r() * 160, y + (r() - .5) * 60]], 22 + r() * 30, q < .35 ? '#9cb6c9' : q < .6 ? '#e3cf96' : q < .8 ? '#d98e5a' : '#7f6aa8', r, 10); }
  blob(1080, 210, 110, 110, '#f0b52a', 120);                         // 太阳
  // 远山（蓝）
  for (let i = 0; i < 160; i++) { const x = r() * 1400; const y = 520 - 260 * Math.max(0, Math.sin(x / 1400 * Math.PI * 2.2 + .6)) * r(); brushStroke(c, [[x, y], [x + (r() - .5) * 60, 560]], 40, i % 3 ? '#2a4f9a' : '#1d3577', r, 8); }
  // 红色山丘
  for (let i = 0; i < 200; i++) { const a = r() * Math.PI; const rr = 520 * Math.sqrt(r()); brushStroke(c, [[350 + Math.cos(a) * rr * 1.3, 1000 - Math.sin(a) * rr * .8], [350 + Math.cos(a) * rr * 1.3 + 50, 1000 - Math.sin(a) * rr * .8 + 10]], 34, i % 4 ? '#c8341f' : '#8e2416', r, 6); }
  // 绿地
  for (let i = 0; i < 140; i++) { const x = 600 + r() * 800, y = 620 + r() * 380; brushStroke(c, [[x, y], [x + 80, y + (r() - .5) * 30]], 30, i % 2 ? '#4e7a3a' : '#2f5a2a', r, 6); }
  // 树
  for (const tx of [1180, 1260, 1330]) { brushStroke(c, [[tx, 820], [tx + 6, 560]], 16, '#2a1a10', r, 3); blob(tx, 540, 60, 90, '#244a24', 50); }
  // 骑马的人影（黑）
  c.save(); c.translate(760, 640); c.fillStyle = '#121212';
  c.beginPath(); c.ellipse(0, 0, 120, 52, -.1, 0, 7); c.fill(); c.beginPath(); c.moveTo(90, -30); c.lineTo(170, -120); c.lineTo(200, -100); c.lineTo(130, 10); c.fill();
  c.lineWidth = 16; c.strokeStyle = '#121212'; c.lineCap = 'round'; for (const lx of [-80, -40, 50, 90]) { c.beginPath(); c.moveTo(lx, 30); c.lineTo(lx + (lx % 3) * 6, 140); c.stroke(); }
  c.beginPath(); c.moveTo(-10, -50); c.lineTo(-20, -170); c.stroke(); c.beginPath(); c.arc(-22, -200, 30, 0, 7); c.fill();
  c.lineWidth = 8; c.beginPath(); c.moveTo(-20, -150); c.lineTo(200, -260); c.stroke();  // 长矛
  c.restore();
  return cv;
}
// 几何化的版本：同样的位置，换成圆、线、色块（康定斯基后来的语言，构图原创）
const GEO = [
  { k: 'circ', x: 1080, y: 210, r: 120, cols: ['#f0b52a', '#c8341f', '#1d3577'] },
  { k: 'tri', x: 520, y: 470, s: 260, col: '#2a4f9a' }, { k: 'tri', x: 900, y: 500, s: 190, col: '#1d3577' },
  { k: 'arc', x: 350, y: 1000, r: 520, col: '#c8341f' },
  { k: 'line', x: 740, y: 440, a: -0.46, l: 520, col: '#121212', w: 14 },
  { k: 'circ', x: 738, y: 440, r: 34, cols: ['#121212'] },
  { k: 'rect', x: 1000, y: 780, w: 380, h: 120, col: '#4e7a3a', a: .2 },
  { k: 'line', x: 1260, y: 700, a: Math.PI / 2, l: 300, col: '#2a1a10', w: 10 },
  { k: 'circ', x: 1260, y: 540, r: 70, cols: ['#244a24', '#e8b923'] },
  { k: 'line', x: 760, y: 640, a: 0.08, l: 300, col: '#121212', w: 22 },
];
function drawGeo(c, e, m, t, beat) {
  // m: 0 不可见 → 1 完整；beat: 音乐驱动的位移
  if (m <= 0) return; c.save(); c.globalAlpha = clamp(m * 1.5);
  const bx = e.x + (beat ? beat.x : 0), by = e.y + (beat ? beat.y : 0), sc = (beat ? beat.s : 1) * lerp(.4, 1, ease.out(m)), rot = beat ? beat.r : 0;
  c.translate(bx, by); c.rotate(rot); c.scale(sc, sc);
  if (e.k === 'circ') e.cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, e.r * (1 - i / e.cols.length * .8), 0, 7); c.fill(); });
  if (e.k === 'tri') { c.fillStyle = e.col; c.beginPath(); c.moveTo(0, -e.s); c.lineTo(e.s * .9, e.s * .55); c.lineTo(-e.s * .9, e.s * .55); c.fill(); }
  if (e.k === 'arc') { c.strokeStyle = e.col; c.lineWidth = 40; c.beginPath(); c.arc(0, 0, e.r * .7, Math.PI, Math.PI * 2); c.stroke(); }
  if (e.k === 'line') { c.strokeStyle = e.col; c.lineWidth = e.w; c.lineCap = 'round'; c.beginPath(); c.moveTo(-Math.cos(e.a) * e.l / 2, -Math.sin(e.a) * e.l / 2); c.lineTo(Math.cos(e.a) * e.l / 2, Math.sin(e.a) * e.l / 2); c.stroke(); }
  if (e.k === 'rect') { c.rotate(e.a); c.fillStyle = e.col; c.fillRect(-e.w / 2, -e.h / 2, e.w, e.h); }
  c.restore();
}
const KD = { t0: GP('dusk')[0], rev: GP('reveal'), geo0: LS(24) + 0.6, move0: LS(25) + 1.0, end: LS(26) - 1.0 };
const [KC, KCx] = mk2d(1400, 1000);
shot(KD.t0, KD.end, {
  grain: .06, xin: .5,
  init() { KAND = makeKand(); },
  draw(ctx, lt, t) {
    const rot = ease.inout((t - KD.rev[0] + 0.6) / 2.2);       // 0 = 侧放，1 = 正过来
    const zoom = lerp(0.55, 0.78, ease.inout((t - KD.t0) / (KD.rev[0] - KD.t0)));
    const flatten = ease.inout((t - KD.geo0) / 5.0);            // 墙和光退场，画占满
    // 画室的黄昏
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3a2414'); g.addColorStop(.5, '#7a4a24'); g.addColorStop(1, '#1e120a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const fl = ctx.createLinearGradient(0, 860, 0, H); fl.addColorStop(0, '#2a1a0e'); fl.addColorStop(1, '#120a06'); ctx.fillStyle = fl; ctx.fillRect(0, 860, W, H - 860);
    // 画布内容：具象 → 几何
    KCx.globalAlpha = 1; KCx.fillStyle = '#e9dcbc'; KCx.fillRect(0, 0, 1400, 1000);
    const geoM = flatten;
    KCx.globalAlpha = 1 - geoM * .92; KCx.drawImage(KAND, 0, 0); KCx.globalAlpha = 1;
    // 运动：音乐响度 + 节拍
    const mv = sstep(KD.move0, KD.move0 + 2, t); const e = menv(t), [bi, since] = beatIdx(t); const pulse = Math.exp(-since * 6) * mv;
    GEO.forEach((el, i) => {
      const ph = i * 1.7 + t * (0.4 + i * 0.05);
      const beat = { x: mv * (Math.sin(ph) * 120 + Math.sin(bi * 1.3 + i) * 40 * pulse), y: mv * (Math.cos(ph * .8) * 80), s: 1 + mv * (e * .25 + pulse * .2 * ((i % 3) === 0)), r: mv * Math.sin(ph * .5) * .6 };
      drawGeo(KCx, el, sstep(i * 0.25, i * 0.25 + 1.2, (t - KD.geo0)), t, beat);
    });
    // 运动阶段：新形状随拍出现
    if (mv > 0) for (let j = 0; j < 14; j++) { const st = KD.move0 + 1.5 + j * 1.05; const a = sstep(st, st + .3, t); if (a <= 0) continue; const r = mulberry(j * 13 + 1);
      const el = [{ k: 'circ', x: 200 + r() * 1000, y: 150 + r() * 700, r: 30 + r() * 90, cols: [['#c8341f', '#1d3577', '#e8b923', '#121212'][j % 4], '#e9dcbc'] }, { k: 'tri', x: 200 + r() * 1000, y: 200 + r() * 600, s: 50 + r() * 90, col: ['#1d3577', '#e8b923', '#c8341f'][j % 3] }, { k: 'line', x: 200 + r() * 1000, y: 200 + r() * 600, a: r() * 3, l: 200 + r() * 400, col: '#121212', w: 4 + r() * 10 }][j % 3];
      drawGeo(KCx, el, a, t, { x: Math.sin(t * 1.2 + j) * 60, y: Math.cos(t + j) * 40, s: 1 + e * .3, r: t * .3 * (j % 2 ? 1 : -1) }); }
    // 把画布放进场景
    const cw = 1400, ch = 1000;
    ctx.save();
    ctx.translate(W / 2, lerp(560, H / 2, flatten));
    const sc = lerp(zoom, Math.max(W / ch, H / cw) * 1.0, flatten * 0) ;
    const fullSc = lerp(1, 1.08, 0) * Math.max(W / cw, H / ch);
    ctx.rotate(lerp(Math.PI / 2, 0, rot));
    const s2 = lerp(zoom, fullSc, flatten);
    ctx.scale(s2, s2);
    // 投影
    if (flatten < 1) { ctx.fillStyle = `rgba(0,0,0,${.45 * (1 - flatten)})`; ctx.fillRect(-cw / 2 + 30, -ch / 2 + 30, cw, ch); }
    ctx.drawImage(KC, -cw / 2, -ch / 2);
    ctx.strokeStyle = `rgba(60,40,20,${1 - flatten})`; ctx.lineWidth = 14; ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    // 黄昏光（画室阶段）
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1 - flatten; const lg = ctx.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, '#ffb070'); lg.addColorStop(.7, '#d07040'); lg.addColorStop(1, '#5a2a14'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore();
    eraTag(ctx, '约 1910', '慕尼黑 · 康定斯基的画室', sstep(.4, 1, lt) * (1 - sstep(5, 6, lt)));
    const l24 = t - LS(24); stamp(ctx, '本人讲述', null, 1620, 240, sstep(.4, .8, l24) * (1 - sstep(5, 5.6, l24)));
    const l25 = t - LS(25); eraTag(ctx, '1921', '柏林 · 只有形状和颜色在动的电影', sstep(.3, .9, l25) * (1 - sstep(6, 7, l25)), true);
    if (t > KD.move0 + 4) codeBox(ctx, [`size = 1.0 + loudness * ${(0.25).toFixed(2)}  // ${e.toFixed(2)}`], 72, 860 - 80, 99, { size: 30, alpha: sstep(KD.move0 + 4, KD.move0 + 4.5, t) * (1 - sstep(KD.move0 + 11, KD.move0 + 11.5, t)) });
    fadeBlack(ctx, sstep(KD.end - 1.0, KD.end, t));
  }
});

// ---------- 莱恩·莱：直接在胶片上画 ----------
function filmStrip(ctx, t, content) {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
  const fx = 360, fw = W - 720; // 胶片区
  content(ctx, fx, fw);
  // 齿孔边
  ctx.fillStyle = '#161310'; ctx.fillRect(fx - 150, 0, 150, H); ctx.fillRect(fx + fw, 0, 150, H);
  ctx.fillStyle = '#e9e1cc'; const off = (t * 520) % 110;
  for (let y = -110; y < H + 110; y += 110) { ctx.beginPath(); ctx.roundRect(fx - 108, y + off, 58, 66, 9); ctx.fill(); ctx.beginPath(); ctx.roundRect(fx + fw + 50, y + off, 58, 66, 9); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,.5)'; for (let y = -110; y < H + 110; y += 110 * 2) ctx.fillRect(fx, y + off * 1, fw, 3);
}
const LL = { t0: LS(26) - 1.0, draw0: LS(28), dance: GP('film scratch dance')[0], end: GP('act1 finale')[0] };
shot(LL.t0, LL.end, {
  grain: .08, xin: .8, bloom: .25, bthr: .5,
  draw(ctx, lt, t, f) {
    const dancing = t >= LL.dance;
    filmStrip(ctx, t, (c, fx, fw) => {
      c.save(); c.beginPath(); c.rect(fx, 0, fw, H); c.clip();
      const cols = ['#ff3d2e', '#ffd23f', '#2ec4ff', '#ff6fd8', '#7dff6a', '#ff8a1f'];
      if (!dancing) {
        c.fillStyle = '#d9cfb8'; c.fillRect(fx, 0, fw, H); // 空白胶片（透明片基）
        const p = sstep(LL.draw0 - .2, LL.dance, t);
        // 笔：一笔笔画上色块和线
        const n = Math.floor(p * 44);
        for (let k = 0; k < n; k++) { const r = mulberry(k * 7 + 3); c.globalAlpha = .85; c.fillStyle = cols[k % 6]; const x = fx + r() * fw, w = 30 + r() * 180, y = ((r() * H + t * 520) % (H + 300)) - 150; c.beginPath(); c.ellipse(x, y, w, 40 + r() * 140, r(), 0, 7); c.fill(); }
        if (p > 0 && p < 1) { const r = mulberry(n * 7 + 3); const x = fx + r() * fw, y = ((r() * H + t * 520) % (H + 300)) - 150; c.globalAlpha = 1; c.fillStyle = '#1a1a1a'; c.save(); c.translate(x + 30, y - 30); c.rotate(-.7); c.fillRect(-8, -240, 16, 240); c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.lineTo(0, 26); c.fill(); c.restore(); }
      } else {
        // 跳舞：每一拍一种画法
        const [bi, since] = beatIdx(t); const r = mulberry(bi * 131 + 9); const e = menv(t);
        c.fillStyle = bi % 4 === 3 ? '#0c0c0c' : '#151010'; c.fillRect(fx, 0, fw, H);
        const style = bi % 4;
        const nB = 5 + Math.floor(r() * 6);
        for (let k = 0; k < nB; k++) { c.globalAlpha = .82; c.fillStyle = cols[Math.floor(r() * 6)];
          if (style === 0) { const x = fx + r() * fw, w = 40 + r() * 220; c.fillRect(x, 0, w, H); }
          else if (style === 1) { c.beginPath(); c.arc(fx + r() * fw, r() * H, (60 + r() * 200) * (1 + e * .5), 0, 7); c.fill(); }
          else if (style === 2) { const y = r() * H; c.fillRect(fx, y, fw, 20 + r() * 120); }
          else { c.beginPath(); c.moveTo(fx + r() * fw, 0); c.lineTo(fx + r() * fw, H); c.lineTo(fx + r() * fw, H); c.lineWidth = 30 + r() * 80; c.strokeStyle = c.fillStyle; c.stroke(); } }
        // 刮痕：白色抖动线
        c.globalAlpha = 1; c.strokeStyle = '#fff'; c.lineWidth = 2.5;
        for (let k = 0; k < 18 + e * 20; k++) { c.beginPath(); let x = fx + r() * fw; c.moveTo(x, 0); for (let y = 0; y <= H; y += 45) { x += (r() - .5) * 26; c.lineTo(x, y); } c.stroke(); }
        // 爆开：重拍上一圈放射线
        if (since < .18) { c.save(); c.translate(fx + fw / 2, H / 2); c.strokeStyle = `rgba(255,255,240,${1 - since / .18})`; c.lineWidth = 6; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; c.beginPath(); c.moveTo(Math.cos(a) * 120, Math.sin(a) * 120); c.lineTo(Math.cos(a) * 900, Math.sin(a) * 900); c.stroke(); } c.restore(); }
      }
      c.restore();
    });
    { const a = sstep(.8, 1.4, lt) * (1 - sstep(7, 8, lt)); if (a > 0) { ctx.save(); ctx.globalAlpha = a * .85; ctx.fillStyle = '#0b0a08'; ctx.beginPath(); ctx.roundRect(40, 40, 560, 150, 14); ctx.fill(); ctx.restore(); } eraTag(ctx, '1935', '英国邮政广告《彩色盒子》', a); }
    const l27 = t - LS(27); stamp(ctx, '史实', '新西兰传记辞典', 1660, 300, sstep(.4, .8, l27) * (1 - sstep(4.6, 5.2, l27)));
  }
});

// ---------- 幕高潮：手工时代大合奏（巨大诡盘）→ 扫描线 ----------
const [MS, MSx] = mk2d(480, 360);
const FN = { t0: GP('act1 finale')[0], end: A1[2] };
shot(FN.t0, FN.end, {
  grain: .06, xin: .6, bloom: .5, bthr: .35,
  init() { if (!DISC) DISC = makeDisc(440); if (!KAND) KAND = makeKand(); },
  draw(ctx, lt, t, f) {
    ctx.fillStyle = '#0b0705'; ctx.fillRect(0, 0, W, H);
    const dur = FN.end - FN.t0, sp = lerp(0.4, 9, Math.pow(clamp(lt / (dur - 3)), 2.2));
    const ang = lt * 0.4 + Math.pow(clamp(lt / (dur - 3)), 3.2) * 60;
    const R = 520 + lt * 6; const cx = W / 2, cy = H / 2;
    const scan = sstep(dur - 3.2, dur - 1.6, lt);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -Math.PI / 8 + .02, Math.PI / 8 - .02); ctx.closePath(); ctx.clip();
      const kind = k % 4;
      ctx.rotate(Math.PI / 2);
      if (kind === 0) { ctx.save(); ctx.translate(0, -R * .55); ctx.scale(.42, .42); ctx.drawImage(KAND, -700, -500); ctx.restore(); }
      else if (kind === 1) { ctx.fillStyle = '#1b1510'; ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.fillStyle = '#c8b898'; for (let j = 0; j < 5; j++) { ctx.fillRect(-120 + j * 50, -R * .9, 30, R * .5); } bird(ctx, 0, -R * .45, 60, (lt * 3 + k / 8) % 1, '#efe6d6'); }
      else if (kind === 2) { const cols = ['#ff3d2e', '#ffd23f', '#2ec4ff', '#ff6fd8']; for (let j = 0; j < 6; j++) { ctx.fillStyle = cols[(j + Math.floor(lt * 4)) % 4]; ctx.fillRect(-R + j * R / 3, -R, R / 4, 2 * R); } }
      else { ctx.fillStyle = '#e8d8b4'; ctx.fillRect(-R, -R, 2 * R, 2 * R); bird(ctx, 0, -R * .6, 90, (lt * 2) % 1, '#7a2e1c'); }
      ctx.restore();
    }
    // 缝
    for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4 + Math.PI / 8); ctx.fillStyle = '#000'; ctx.fillRect(-10, -R - 4, 20, R * .2); ctx.restore(); }
    ctx.strokeStyle = '#5a3c1e'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    ctx.restore();
    // 转快了：运动模糊感
    if (sp > 3) { ctx.save(); ctx.globalAlpha = clamp((sp - 3) / 8) * .5; ctx.translate(cx, cy); ctx.rotate(.15); ctx.translate(-cx, -cy); ctx.drawImage(ctx.canvas, 0, 0); ctx.restore(); }
    // 缝变成阴极射线管的扫描线
    if (scan > 0) {
      fadeBlack(ctx, scan);
      ctx.save(); ctx.globalAlpha = scan; ctx.fillStyle = '#ff5a36';
      for (let y = 0; y < H; y += 6) { const a = .25 + .75 * Math.max(0, Math.sin(y * .02 - lt * 20)); ctx.globalAlpha = scan * a * (1 - sstep(dur - 1.2, dur - .4, lt)); ctx.fillRect(0, y, W, 2); }
      ctx.restore();
      const beam = sstep(dur - 1.3, dur - .3, lt); if (beam > 0) { ctx.save(); ctx.strokeStyle = '#ffb08a'; ctx.lineWidth = 4; ctx.shadowColor = '#ff5a36'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(200, H / 2); ctx.lineTo(lerp(200, W - 200, beam), H / 2 + Math.sin(beam * 9) * 60 * (1 - beam)); ctx.stroke(); ctx.restore(); }
    }
    flash(ctx, (1 - clamp(lt / .2)) * .4);
  }
});
window.A1X = { makeDisc, drawDisc, filmLook, titleCard, makeKand, GEO, drawGeo, filmStrip, bird, getDisc: () => DISC, getKand: () => KAND, setDisc: d => DISC = d, setKand: k => KAND = k };
})();
