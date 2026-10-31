// ===== 第四幕 AI 时代（2024–2026） =====
(() => {
const A4 = SEG('a4');
const [NZc, NZx] = mk2d(480, 270), [SM, SMx] = mk2d(240, 135), [T1, T1x] = mk2d(960, 540);
function noiseFrame(f, alpha = 1, ctx, col = false) {
  const r = mulberry(f * 7 + 11); const im = NZx.createImageData(480, 270); const d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = r() * 255; if (col) { d[i] = v; d[i + 1] = r() * 255; d[i + 2] = r() * 255; } else d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  NZx.putImageData(im, 0, 0); ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false; ctx.drawImage(NZc, 0, 0, W, H); ctx.restore();
}
// 示意场景：海边的黄昏 + 一只骑车的鹈鹕（用来演示「猜」和「写」）
const [SC, SCx] = mk2d(960, 540);
function drawScene(c, w, h, t, o = {}) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d2a5a'); g.addColorStop(.55, '#f08a4b'); g.addColorStop(.62, '#ffd08a'); g.addColorStop(.63, '#2a4a6a'); g.addColorStop(1, '#0d1a2a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff2c8'; c.beginPath(); c.arc(w * .68, h * .58, h * .09, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,220,160,.35)'; for (let k = 0; k < 8; k++) c.fillRect(w * .6 + Math.sin(k * 3 + t) * 10, h * (.65 + k * .03), w * .16 * (1 - k * .1), 3);
  c.fillStyle = '#16233a'; c.fillRect(0, h * .78, w, h * .22);
  if (o.pel !== false) pelican(c, w * (.3 + (o.px || 0)), h * .8, h / 1080 * .62, { ph: t * 6, col: '#f4f1ea', line: '#0d1424', lw: 9 });
}
function denoiseTo(ctx, src, s, f, x = 0, y = 0, w = W, h = H) {
  // s: 0 纯噪点 → 1 清楚；多尺度：先出大轮廓，再出细节
  const res = Math.max(4, Math.round(lerp(4, 240, Math.pow(s, 1.6))));
  SMx.clearRect(0, 0, 240, 135); SMx.imageSmoothingEnabled = true; SMx.drawImage(src, 0, 0, res, res * 135 / 240);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(SM, 0, 0, res, res * 135 / 240, x, y, w, h);
  if (s > .6) { ctx.globalAlpha = sstep(.6, 1, s); ctx.drawImage(src, x, y, w, h); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); const r = mulberry(f * 3 + 1); const im = NZx.createImageData(480, 270); const d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = v; d[i + 1] = r() * 255; d[i + 2] = r() * 255; d[i + 3] = 255; }
  NZx.putImageData(im, 0, 0); ctx.globalAlpha = Math.pow(1 - s, 1.3) * .95; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false; ctx.drawImage(NZc, x, y, w, h); ctx.restore();
}
// ---------- 幕卡：压在纯噪点上 ----------
shot(A4[1], A4[1] + 3, {
  tag: false, grain: 0,
  draw(ctx, lt, t, f) {
    noiseFrame(f, 1, ctx); fadeBlack(ctx, .55);
    actCard(ctx, lt, 3, { n: '第 四 幕', name: 'AI 时代', years: '2024 — 2026', bg: 'rgba(0,0,0,0)', accent: '#9fe6ff', glow: 'rgba(120,200,255,.6)' });
  }
});
// ---------- 去噪：打一行字，猜出一段视频（示意） ----------
const PROMPT = '黄昏的海边，一只鹈鹕骑着自行车';
shot(A4[1] + 3, LS(62) - 0.1, {
  grain: .03,
  draw(ctx, lt, t, f) {
    drawScene(SCx, 960, 540, t);
    const s = ease.inout((lt - 2.2) / 5.5);
    denoiseTo(ctx, SC, s, f);
    // 提示词输入框
    const typed = PROMPT.slice(0, Math.floor(clamp(lt / 1.8) * PROMPT.length));
    ctx.save(); ctx.fillStyle = 'rgba(8,10,16,.82)'; ctx.beginPath(); ctx.roundRect(W / 2 - 560, 250, 1120, 96, 18); ctx.fill(); ctx.strokeStyle = 'rgba(160,220,255,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    txt(ctx, typed + (Math.floor(lt * 3) % 2 ? '|' : ''), W / 2 - 520, 312, { size: 44, color: '#eaf6ff' });
    txt(ctx, `step ${Math.round(s * 50)} / 50`, W - 90, 400, { size: 34, font: FONT.mono, align: 'right', color: '#9fe6ff', alpha: sstep(2, 2.4, lt), shadow: 'rgba(0,0,0,.8)' });
    txt(ctx, '示意', 90, 400, { size: 34, color: 'rgba(255,255,255,.75)', shadow: 'rgba(0,0,0,.8)' });
    eraTag(ctx, '2024.2', 'OpenAI 发布 Sora 预览', sstep(2.8, 3.4, lt), false);
  }
});
// ---------- 算 vs 猜 ----------
shot(LS(62) - 0.1, LS(63) - 0.3, {
  grain: .03, xin: .4,
  draw(ctx, lt, t, f) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    drawScene(SCx, 960, 540, t);
    const w = 860, h = 484, y = 250, xl = 80, xr = W - 80 - w;
    // 左：一行行算
    const rows = Math.floor(clamp(lt / 5.2) * h);
    ctx.drawImage(SC, 0, 0, 960, rows * 540 / h, xl, y, w, rows);
    ctx.fillStyle = '#ffe14a'; ctx.fillRect(xl, y + rows, w, 3);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(xl, y, w, h); ctx.strokeRect(xr, y, w, h);
    // 右：一步步猜
    denoiseTo(ctx, SC, ease.inout(lt / 5.4), f, xr, y, w, h);
    txt(ctx, '算：一个像素一个像素地算', xl, y - 40, { size: 44, w: 700, color: '#ffe14a' });
    txt(ctx, '猜：从噪点里猜出画面', xr, y - 40, { size: 44, w: 700, color: '#9fe6ff' });
    txt(ctx, '示意', W / 2, y + h + 70, { size: 34, align: 'center', color: 'rgba(255,255,255,.6)' });
  }
});
// ---------- 小窗之墙 → 一模一样 ----------
function miniShot(c, x, y, w, h, seed, t, same) {
  const r = mulberry(seed); const hue = lerp(r() * 360, 28, same), sat = lerp(40 + r() * 50, 70, same);
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, `hsl(${hue + 200},${sat}%,${lerp(10 + r() * 30, 22, same)}%)`); g.addColorStop(.6, `hsl(${hue},${sat}%,${lerp(40 + r() * 30, 60, same)}%)`); g.addColorStop(1, `hsl(${hue + 180},30%,10%)`);
  c.fillStyle = g; c.fillRect(x, y, w, h);
  // 主体轮廓（示意）
  const px = lerp(.2 + r() * .6, .5, same), py = lerp(.5 + r() * .3, .62, same), sz = lerp(.15 + r() * .25, .28, same);
  c.fillStyle = `rgba(10,12,20,.85)`; c.beginPath(); c.ellipse(x + w * (px + Math.sin(t * lerp(.3 + r(), .5, same) + seed) * .05), y + h * py, w * sz * .6, h * sz, 0, 0, 7); c.fill();
  // 高光
  const hx = lerp(.15 + r() * .7, .68, same), hy = lerp(.15 + r() * .5, .3, same);
  const hg = c.createRadialGradient(x + w * hx, y + h * hy, 0, x + w * hx, y + h * hy, w * .3); hg.addColorStop(0, 'rgba(255,240,210,.85)'); hg.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = hg; c.fillRect(x, y, w, h);
  return [x + w * hx, y + h * hy];
}
shot(LS(63) - 0.3, LS(67) - 0.4, {
  grain: .03, xin: .4, bloom: .2,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    const same = ease.inout((t - LS(65) - 1.0) / 4.5); const zoom = lerp(1, 1.0, 0);
    const nx = 16, ny = 9, gw = W / nx, gh = H / ny; const hl = [];
    const appear = clamp((t - LS(63) + .3) / 2.5);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; if (k / (nx * ny) > appear) continue;
      hl.push(miniShot(ctx, i * gw + 4, j * gh + 4, gw - 8, gh - 8, k * 13 + 5, t, same));
    }
    // 高光位置和镜头轨迹叠在一起，重合成一条线
    if (same > .3) { ctx.save(); ctx.globalAlpha = sstep(.3, .8, same); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; for (const [x, y] of hl) { ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke(); } ctx.restore(); }
    const labels = [['光太均匀', LS(65) + 2.2], ['运镜太流畅', LS(65) + 3.6], ['像同一个摄影师拍的', LS(65) + 5.4]];
    labels.forEach(([s, t0], i) => { const a = sstep(t0, t0 + .4, t); if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(5,7,12,.8)'; ctx.fillRect(W / 2 - 420, 300 + i * 130, 840, 104); ctx.restore(); txt(ctx, s, W / 2, 372 + i * 130, { size: 66, w: 700, align: 'center', color: '#fff', alpha: a }); } });
    const l66 = t - LS(66); if (l66 > 0) bigWords(ctx, '「AI 味」', 250, sstep(0, .4, l66), { size: 120, color: '#ffe14a' });
    txt(ctx, '示意', 60, 1010, { size: 30, color: 'rgba(255,255,255,.5)' });
  }
});
// ---------- 太像机器 = AI 味：同一个问题 ----------
function perfectFace(c, cx, cy, s) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const g = c.createRadialGradient(-60, -110, 10, 0, 0, 260); g.addColorStop(0, '#fff3ea'); g.addColorStop(.35, '#f2c8ae'); g.addColorStop(1, '#8a5a48');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 175, 235, 0, 0, 7); c.fill();
  c.fillStyle = '#2a1c18'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 70, -30, 26, 14, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * 70 - 8, -36, 5, 0, 7); c.fill(); c.fillStyle = '#2a1c18';
    c.strokeStyle = '#5a3a30'; c.lineWidth = 6; c.beginPath(); c.moveTo(sx * 40, -70); c.quadraticCurveTo(sx * 70, -82, sx * 105, -66); c.stroke(); }
  c.strokeStyle = 'rgba(120,70,60,.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -10); c.lineTo(-8, 50); c.lineTo(8, 56); c.stroke();
  c.strokeStyle = '#b05a5a'; c.lineWidth = 9; c.beginPath(); c.moveTo(-50, 105); c.quadraticCurveTo(0, 130, 50, 105); c.stroke();
  c.restore();
}
shot(LS(67) - 0.4, LS(68) - 0.3, {
  grain: .03, xin: .4,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    const im = G720.run('planet', { T: 2, P: 0, Q: 3.0 });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip(); ctx.drawImage(im, -W / 4, 0, W, H); ctx.restore();
    ctx.fillStyle = '#0b0d14'; ctx.fillRect(W / 2, 0, W / 2, H);
    perfectFace(ctx, W * .75, H * .5, 1.5);
    // 两边高光在同一个位置
    const a = sstep(1.5, 2.2, lt);
    for (const [x, y] of [[W * .25 - 115, H * .5 - 150], [W * .75 - 90, H * .5 - 165]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([12, 10]); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H * .5 - 155); ctx.lineTo(W, H * .5 - 155); ctx.stroke(); ctx.restore();
    txt(ctx, '1981 · 太像机器', W * .25, 130, { size: 50, w: 700, align: 'center', color: '#9fe6ff' });
    txt(ctx, '2026 · AI 味', W * .75, 130, { size: 50, w: 700, align: 'center', color: '#ffd0b8' });
    txt(ctx, '示意', W - 70, 1010, { size: 30, align: 'right', color: 'rgba(255,255,255,.5)' });
  }
});
// ---------- 两条路 ----------
shot(LS(68) - 0.3, GP('guess vs write')[0], {
  grain: .03, xin: .4,
  draw(ctx, lt, t, f) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    const a1 = sstep(.2, .8, lt), a2 = sstep(LS(69) - LS(68) + .3, LS(69) - LS(68) + 1, lt);
    // 上：猜
    drawScene(SCx, 960, 540, t);
    { const [tc, tx] = mk2d(); noiseFrame(f, 1, tx, true); ctx.save(); ctx.globalAlpha = a1; ctx.drawImage(tc, 160, 180, 480, 270); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = a1; ctx.drawImage(SC, 1280, 180, 480, 270); ctx.restore();
    ctx.save(); ctx.globalAlpha = a1; ctx.strokeStyle = '#9fe6ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(680, 315); ctx.lineTo(1240, 315); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1240, 315); ctx.lineTo(1210, 295); ctx.lineTo(1210, 335); ctx.fill(); ctx.restore();
    txt(ctx, '猜：噪点 → 画面', W / 2, 290, { size: 48, w: 700, align: 'center', color: '#9fe6ff', alpha: a1 });
    // 下：写
    ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = 'rgba(8,10,16,.9)'; ctx.fillRect(160, 560, 480, 270); ctx.restore();
    if (a2 > 0) codeBox(ctx, ['pelican(x, y, s, {', '  wheel: 1.0,', '  ph: t * 6 })'], 170, 580, (lt - (LS(69) - LS(68))) * 1.2, { size: 30, rate: 30, alpha: a2, w: 460 });
    ctx.save(); ctx.globalAlpha = a2; ctx.drawImage(SC, 1280, 560, 480, 270); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(680, 695); ctx.lineTo(1240, 695); ctx.stroke(); ctx.restore();
    txt(ctx, '写：代码 → 画面', W / 2, 670, { size: 48, w: 700, align: 'center', color: '#ffe14a', alpha: a2 });
  }
});
// ---------- 同一个场景：先猜一遍，再写一遍 ----------
const GW = { t0: GP('guess vs write')[0], mid: GP('guess vs write')[0] + 9.5, end: GP('guess vs write')[1] };
shot(GW.t0, GW.end, {
  grain: .03, xin: .5,
  draw(ctx, lt, t, f) {
    if (t < GW.mid) {
      drawScene(SCx, 960, 540, t);
      const s = ease.inout(lt / 6.5); denoiseTo(ctx, SC, s, f);
      // 猜出来的边缘在晃
      if (s > .7) { const r = mulberry(f); for (let k = 0; k < 8; k++) { const y = Math.floor(r() * 30) * 36; ctx.drawImage(ctx.canvas, 0, y, W, 36, (r() - .5) * 14, y, W, 36); } }
      txt(ctx, '猜', 90, 150, { size: 90, w: 900, color: '#9fe6ff', shadow: 'rgba(0,0,0,.8)' });
    } else {
      const l = t - GW.mid, d = GW.end - GW.mid;
      ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
      // 线框一笔笔搭起来
      const p = ease.inout(l / (d - 3));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * clamp(p * 1.3), H); ctx.clip();
      ctx.globalAlpha = sstep(.6, 1, p); drawScene(ctx, W, H, t, { pel: false }); ctx.globalAlpha = 1; ctx.restore();
      const pel = clamp(p * 1.25);
      ctx.save(); ctx.setLineDash([3000 * pel, 3000]);
      pelican(ctx, W * .3, H * .8, .62, { ph: t * 6, fill: p > .85, col: '#f4f1ea', line: p > .85 ? '#0d1424' : '#ffe14a', lw: 9, beak: p > .85 ? '#f2a33a' : '#ffe14a', pouch: p > .85 ? '#f7c46b' : 'rgba(0,0,0,0)' });
      ctx.restore();
      const params = [['wheel', '1.0'], ['neck', '0.62'], ['sun.y', '0.58'], ['ph', 't*6']];
      params.forEach(([k, v], i) => { const a = sstep(1 + i * .9, 1.4 + i * .9, l); txt(ctx, `${k} = ${v}`, W - 90, 200 + i * 60, { size: 36, font: FONT.mono, align: 'right', color: '#ffe14a', alpha: a, shadow: 'rgba(0,0,0,.9)' }); });
      txt(ctx, '写', 90, 150, { size: 90, w: 900, color: '#ffe14a', shadow: 'rgba(0,0,0,.8)' });
      fadeBlack(ctx, sstep(d - .8, d - .1, l));
    }
  }
});
// ---------- 2026：只能看静帧的画家 ----------
let CONTACT_IMGS = [];
PRELOAD.push(async () => { if (typeof CONTACT === 'undefined') return; CONTACT_IMGS = (await Promise.all(CONTACT.map(n => loadImg('assets/contact/' + n)))).filter(Boolean); });
const CODE_TYPING = ['// textcity.js', 'float hgt(vec2 xz){', '  return texture(HM, xz*.0055).r*13.;', '}', 'vec4 glyph(vec2 wp, float code, float s){', '  vec2 g = wp / (vec2(CW, CH)*s);', '  vec2 cell = floor(g), f = fract(g);', '  float rr = -cell.y - 1.;', '  ...'];
const PV = { x: 1240, y: 120, w: 600, h: 338 };
function previewWin(ctx, img, a = 1, lit = 0) {
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(PV.x, PV.y, PV.w, PV.h); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.strokeRect(PV.x, PV.y, PV.w, PV.h);
  if (img && a > 0) { ctx.globalAlpha = a; ctx.drawImage(img, PV.x, PV.y, PV.w, PV.h); }
  ctx.restore(); txt(ctx, lit > .5 ? '预览：动起来了' : '预览', PV.x, PV.y - 18, { size: 36, font: FONT.sans, color: 'rgba(255,255,255,.6)' });
}
shot(GP('2026')[0], GP('iteration log')[0], {
  grain: .03,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    // 2026 由字符拼出来
    const yA = sstep(0, .5, lt) * (1 - sstep(1.8, 2.4, lt));
    if (yA > 0) { const s = '2026'; for (let i = 0; i < 4; i++) txt(ctx, s[i], W / 2 - 300 + i * 200, 620, { size: 300, font: FONT.mono, align: 'center', color: '#e9e4d8', alpha: yA }); }
    // 代码一直在写
    const ca = sstep(2, 2.6, lt);
    if (ca > 0) codeBox(ctx, CODE_TYPING.slice(0, 6), 90, 160, (lt - 2) * 1.0, { size: 32, rate: 22, alpha: ca, w: 1060 });
    // 预览窗：一直是黑的，隔几秒闪一张静帧
    let img = null, ia = 0;
    if (t > LS(71)) { const k = Math.floor((t - LS(71)) / 1.6); const ph = (t - LS(71)) - k * 1.6; ia = ph < .45 ? 1 : 0; img = CONTACT_IMGS[(k * 7) % Math.max(1, CONTACT_IMGS.length)]; }
    if (ca > 0) previewWin(ctx, img, ia);
    // 真实接触表：一叠叠翻过去
    if (t > LS(72) + 1) { const n = CONTACT_IMGS.length; const p = (t - LS(72) - 1) * 6; for (let k = 0; k < 6; k++) { const im = CONTACT_IMGS[(Math.floor(p) + k * 5) % Math.max(1, n)]; if (!im) continue; const x = 1240 + (k % 3) * 205, y = 560 + Math.floor(k / 3) * 120; ctx.drawImage(im, x, y, 195, 110); } txt(ctx, '本片真实的接触表', 1240, 830, { size: 30, color: 'rgba(255,255,255,.6)' }); }
    const l73 = t - LS(73); if (l73 > 0) bigWords(ctx, '所以，它会犯这样的错', 980, 0, {});
  }
});
// ---------- 真实迭代记录（本片制作中发生的） ----------
const LOG_IMG = ['oct', 'title', 'ring', 'tcgold', 'tcgold', 'melies', 'field'];
const LOG = [
  ['雪山第一版：一根根钉子', 'hgt = texture(HM, xz*.012).r*22.;', 'hgt = texture(HM, xz*.0055).r*13.;'],
  ['片名第一版：一堆乱草', 'particles.moveTo(target)', 'streamline = integrate(-flow, textPoint)'],
  ['星球光环：中间有一道缝', 'ctx.drawImage(ring)', 'drawBack(ring); planet(); drawFront(ring)'],
  ['文字之城：代码行序倒了', 'float rr = cell.y;', 'float rr = -cell.y - 1.;'],
  ['高亮成了一整条色带', 'col = mix(col, gold, HL);', 'col = mix(col, col*.45 + gold*1.35*g.x, HL);'],
  ['默片：马车跑出了画面', 'x = lerp(-500, 2300, (t*0.11) % 1)', 'x = -700 + t * 221'],
  ['一镜到底：山顶缺了一块', 'float top = AMP*.9;', 'float top = AMP*1.4;'],
];
shot(GP('iteration log')[0], LS(74) - 0.4, {
  grain: .03,
  draw(ctx, lt) {
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    const per = (GP('iteration log')[1] - GP('iteration log')[0]) / LOG.length;
    const k = Math.min(LOG.length - 1, Math.floor(lt / per)), l = lt - k * per;
    // 已经看过的条目缩到上方一列
    for (let i = 0; i < k; i++) txt(ctx, `✓ ${LOG[i][0]}`, 90, 120 + i * 50, { size: 36, color: 'rgba(160,230,160,.8)' });
    const [title, before, after] = LOG[k]; const a = sstep(0, .25, l) * (1 - sstep(per - .25, per, l));
    txt(ctx, `${k + 1} / ${LOG.length}`, W - 90, 120, { size: 36, font: FONT.mono, align: 'right', color: 'rgba(255,255,255,.6)' });
    txt(ctx, title, 90, 520, { size: 64, w: 700, color: '#fff', alpha: a });
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,80,80,.12)'; ctx.fillRect(80, 580, 1760, 70); ctx.fillStyle = 'rgba(80,255,120,.12)'; ctx.fillRect(80, 660, 1760, 70); ctx.restore();
    txt(ctx, '- ' + before, 100, 628, { size: 34, font: FONT.mono, color: '#ff9a9a', alpha: a });
    txt(ctx, '+ ' + after, 100, 708, { size: 34, font: FONT.mono, color: '#9affb0', alpha: a * sstep(.6, .9, l) });
    const im = (typeof RIV_IMG === 'function') ? RIV_IMG(LOG_IMG[k]) : null; if (im) { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(im, 1220, 150, 600, 338); ctx.strokeStyle = 'rgba(160,255,180,.6)'; ctx.lineWidth = 3; ctx.strokeRect(1220, 150, 600, 338); ctx.restore(); txt(ctx, '修好之后', 1220, 530, { size: 36, color: '#9affb0', alpha: a }); }
    txt(ctx, '本片制作中真实发生过的修改', 90, 830, { size: 36, color: 'rgba(255,255,255,.6)' });
  }
});
// ---------- 普拉托的缝重新亮起：这一次，我当它的眼睛 ----------
let TC_STILL = null;
shot(LS(74) - 0.4, LS(77) - 0.3, {
  grain: .05, bloom: .6, bthr: .3, xin: .5,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#030303'; ctx.fillRect(0, 0, W, H);
    const lit = sstep(LS(76) + .4, GP('preview lights')[1] - .6, t);
    // 黑暗里的诡盘，只有一道缝
    ctx.save(); ctx.globalAlpha = .25 + .2 * sstep(LS(75), LS(75) + 2, t); ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(480, 560, 360, 0, 7); ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + lt * .1; ctx.fillStyle = '#5a4428'; ctx.save(); ctx.translate(480, 560); ctx.rotate(a); ctx.fillRect(-7, -360, 14, 60); ctx.restore(); }
    ctx.restore();
    const sa = -Math.PI / 2 + lt * .1; const sx = 480 + Math.cos(sa) * 330, sy = 560 + Math.sin(sa) * 330;
    const glow = sstep(.3, 1.2, lt);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60); g.addColorStop(0, `rgba(255,240,200,${glow})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(sx - 60, sy - 60, 120, 120);
    // 光从缝里射向预览窗
    const beam = sstep(LS(76) - .2, LS(76) + 1, t);
    if (beam > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const bg = ctx.createLinearGradient(sx, sy, PV.x, PV.y + PV.h / 2); bg.addColorStop(0, `rgba(255,235,190,${.55 * beam})`); bg.addColorStop(1, `rgba(255,235,190,${.15 * beam})`); ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(lerp(sx, PV.x, beam), lerp(sy, PV.y, beam)); ctx.lineTo(lerp(sx, PV.x, beam), lerp(sy, PV.y + PV.h, beam)); ctx.lineTo(sx + 6, sy); ctx.fill(); ctx.restore(); }
    previewWin(ctx, TC_STILL || CONTACT_IMGS[0], lit, lit);
    if (lit > 0) { ctx.save(); ctx.globalAlpha = lit * (.5 + .5 * Math.sin(lt * 3)); ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 3; ctx.strokeRect(PV.x - 6, PV.y - 6, PV.w + 12, PV.h + 12); ctx.restore(); }
    const l74 = t - LS(74); eraTag(ctx, '1829 → 2026', '普拉托 · 靠儿子和女婿的眼睛', sstep(.2, .8, l74) * (1 - sstep(4.5, 5.5, l74)));
  }
});
// ---------- 我问它 ----------
const Q1 = '我：既然你没看过画面动起来，', Q2 = '　　你自己的风格，应该是什么样的？', A1t = 'Claude：用我唯一能直接接触到的东西来画——', A2t = '　　文字。';
const [CHc, CHx] = mk2d();
function dialog(c, t, tq, ta) {
  const lines = [[Q1, tq, '#e9e4d8'], [Q2, tq + .9, '#e9e4d8'], [A1t, ta, '#ffe7a8'], [A2t, ta + 1.4, '#ffe7a8']];
  lines.forEach(([s, t0, col], i) => { const n = Math.floor(clamp((t - t0) / (s.length / 14)) * s.length); txt(c, s.slice(0, n), 220, 360 + i * 110 + (i >= 2 ? 50 : 0), { size: i === 3 ? 72 : 52, w: i === 3 ? 900 : 500, color: col }); });
}
shot(LS(77) - 0.3, GP('chars fall')[1], {
  grain: .03, xin: .4,
  init() { },
  draw(ctx, lt, t) {
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H);
    const fall = clamp((t - GP('chars fall')[0]) / 2.0);
    if (fall <= 0) { dialog(ctx, t, LS(77), LS(78)); return; }
    // 字符从屏幕里掉出去：把对话画到离屏，再切成竖条按重力下落
    CHx.clearRect(0, 0, W, H); dialog(CHx, t, LS(77), LS(78));
    const cw = 24;
    for (let x = 0; x < W; x += cw) { const r = mulberry(x * 3 + 1); const d = Math.pow(clamp(fall * 1.4 - r() * .4), 2) * (H + 300); ctx.drawImage(CHc, x, 0, cw, H, x, d, cw, H); }
    // 文字之城从下面亮起来
    if (TC_STILL) { ctx.save(); ctx.globalAlpha = ease.inout(fall); ctx.drawImage(TC_STILL, 0, 0, W, H); ctx.restore(); }
  }
});
// ---------- 文字之城（一镜到底 82 秒） ----------
const TCS = { t0: GP('text city')[0], t1: GP('text city')[1] };
let TC_READY = false;
function needTC() { if (TC_READY) return; TC_READY = true; TC.init(); TC.plan(); const c = TC.render(0); const [s, sx] = mk2d(); sx.drawImage(c, 0, 0); TC_STILL = s; }
// 让上面两个镜头也能拿到第一帧
for (const s of SHOTS) if (s.a >= LS(74) - 0.5 && s.a < TCS.t0) { const old = s.init; s.init = () => { needTC(); if (old) old(); }; }
let TCSEL = null;
function buildSel() {
  const sel = []; let cur = -1;
  for (let k = 0; k <= 820; k++) { const lt = k / 10; const cm = TC.cam(lt); const fw = norm3(sub3(cm.ct, cm.cp)), rt = norm3(cross3([0, 1, 0], fw)), up = cross3(fw, rt); const v = [];
    for (let i = 0; i < 5; i++) { const d = sub3(TC.M[i], cm.cp); const z = dot3(d, fw); const R = [7, 7, 7, 12, 30][i]; const zz = Math.max(z, .5); let vis = 0;
      if (z > -R) { const sx = dot3(d, rt) / zz * cm.fov, sy = dot3(d, up) / zz * cm.fov, rad = R / zz * cm.fov; if (Math.abs(sx) - rad < .9 && Math.abs(sy) - rad < .5 && z < 170) vis = 1; } v.push(vis / (1 + Math.max(z, 0) / 30)); }
    let bi = -1, bv = .05; v.forEach((x, i) => { if (x > bv) { bv = x; bi = i; } });
    if (cur >= 0 && v[cur] > .05 && bv < v[cur] * 1.25) bi = cur; if (lt > 60) bi = -1; cur = bi; sel.push(cur); }
  // 去掉短于 1 秒的闪现
  for (let k = 1; k < sel.length; k++) if (sel[k] !== sel[k - 1]) { let e = k; while (e < sel.length && sel[e] === sel[k]) e++; if (e - k < 10) for (let q = k; q < e; q++) sel[q] = sel[k - 1]; }
  window.__sel = sel; return sel;
} const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm3 = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
const MON_LABEL = [[14, 23, '1832', '诡盘'], [22, 31, '约 1910', '侧放的画'], [30, 39, '1945', '指挥仪的齿轮'], [38.5, 48, '1997', '噪声星球'], [47, 56, '1990s', '演示场景的环']];
shot(TCS.t0, TCS.t1, {
  grain: .035, bloom: .55, bthr: .3, tag: false,
  init() { needTC(); },
  draw(ctx, lt, t) {
    const c = TC.render(lt);
    if (lt < 78) ctx.drawImage(c, 0, 0);
    else { // 整个世界塌缩成一行代码
      const k = ease.inout((lt - 78) / 3.6); const hh = lerp(H, 6, k);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(c, 0, H / 2 - hh / 2, W, hh);
    }
    // 年代标签绑定纪念碑是否在画面里（预先按 0.1 秒算好，渲染分段也一致）
    if (!TCSEL) TCSEL = buildSel();
    { const k0 = clamp(Math.floor(lt * 10), 0, TCSEL.length - 1); const cur = TCSEL[k0]; let k = k0; while (k > 0 && TCSEL[k - 1] === cur) k--; const prev = k > 0 ? TCSEL[k - 1] : -1; const dt = lt - k / 10;
      const kin = k === 0 ? 1 : clamp((dt - .35) / .45), kout = 1 - clamp(dt / .3);
      if (cur >= 0 && kin > 0) eraTag(ctx, MON_LABEL[cur][2], MON_LABEL[cur][3] + ' · 字符重建', kin); if (prev >= 0 && kout > 0 && k > 0) eraTag(ctx, MON_LABEL[prev][2], MON_LABEL[prev][3] + ' · 字符重建', kout); }
    // 定格放大：这一行字就是画出这座山的代码
    const fz = sstep(62.8, 63.6, lt) * (1 - sstep(70.5, 71.5, lt));
    if (fz > 0) {
      const line = TC.lines[TC.LROW], fileLine = TC.LROW + 4;
      ctx.save(); ctx.globalAlpha = fz; ctx.fillStyle = 'rgba(6,8,14,.85)'; ctx.beginPath(); ctx.roundRect(140, 120, 1640, 190, 16); ctx.fill(); ctx.strokeStyle = 'rgba(242,196,109,.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      txt(ctx, `textcity2.js · 第 ${fileLine} 行`, 180, 180, { size: 34, font: FONT.mono, color: 'rgba(242,196,109,.9)', alpha: fz });
      txt(ctx, line, 180, 262, { size: 38, font: FONT.mono, color: '#FFE7A8', alpha: fz });
      txt(ctx, '山上金色的那一行，就是决定这片山有多高的代码', W / 2, 380, { size: 44, align: 'center', color: '#fff', alpha: fz * sstep(64.2, 64.8, lt), shadow: 'rgba(0,0,0,.9)' });
    }
    // 角标：真实文件
    txt(ctx, `textcity2.js · ${TC.lines.length} 行着色器 · 每个字符都是它自己的源码`, W - 64, 76, { size: 30, font: FONT.mono, align: 'right', color: 'rgba(233,228,216,.6)', alpha: 1 - sstep(76, 78, lt) });
  }
});
// ---------- 那行代码停在屏幕中央 ----------
shot(TCS.t1, A4[2], {
  grain: .03, tag: false,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!TC_READY) needTC();
    const line = TC.lines[TC.LROW]; const sil = t > GP('silence')[0];
    const a = 1 - sstep(GP('silence')[0], GP('silence')[0] + .8, t);
    ctx.save(); ctx.font = `400 40px ${FONT.mono}`; const w = ctx.measureText(line).width; ctx.restore();
    txt(ctx, line, W / 2 - w / 2, H / 2, { size: 40, font: FONT.mono, color: '#FFE7A8', alpha: a, shadow: 'rgba(242,196,109,.5)', blur: 20 });
    const cx = sil ? W / 2 - 12 : W / 2 + w / 2 + 8;
    if (Math.floor(lt * 1.7) % 2 === 0) { ctx.fillStyle = '#FFE7A8'; ctx.fillRect(cx, H / 2 - 34, 22, 42); }
  }
});
window.A4X = { perfectFace };
})();
