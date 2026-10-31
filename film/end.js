// ===== 尾声 看见意外的人 =====
(() => {
const EN = SEG('end');
let RIV = {}; // 胶片之河：本片真实的画面（按时间截出来的帧）
window.RIV_IMG = k => RIV[k];
PRELOAD.push(async () => { if (typeof RIVER === 'undefined') return; for (const [k, f] of Object.entries(RIVER)) RIV[k] = await loadImg('assets/river/' + f); });
const ORDER = () => (typeof RIVER_ORDER !== 'undefined' ? RIVER_ORDER : Object.keys(RIV)).map(k => [k, RIV[k]]).filter(x => x[1]);
const NAMED = ['kand', 'melies', 'lye', 'mosh'];
const FW = 420, FH = 236;
function frameCard(ctx, im, x, y, s, a = 1, glow = 0) {
  const w = FW * s, h = FH * s;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#0d0b08'; ctx.fillRect(x - w / 2 - 18 * s, y - h / 2 - 26 * s, w + 36 * s, h + 52 * s);
  ctx.fillStyle = '#d8cfba'; for (let k = 0; k < 8; k++) { ctx.fillRect(x - w / 2 + k * w / 8 + 6 * s, y - h / 2 - 20 * s, 18 * s, 12 * s); ctx.fillRect(x - w / 2 + k * w / 8 + 6 * s, y + h / 2 + 8 * s, 18 * s, 12 * s); }
  if (im) ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
  if (glow > 0) { ctx.strokeStyle = `rgba(255,231,168,${glow})`; ctx.lineWidth = 6 * s; ctx.strokeRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8); }
  ctx.restore();
}
// 河的位置：u 是沿河的参数（帧序号），返回屏幕位置和缩放
function riverAt(u, off) {
  const z = u - off; // 0 = 最近
  const s = 1.45 / (1 + Math.max(-.9, z) * .34);
  const x = W * .56 - z * 300 * s + Math.sin(z * .5) * 60, y = H * .6 - z * 30 * s - Math.cos(z * .4) * 30 * s;
  return [x, y, s];
}
// 河流的进度（帧序号偏移），说话时放慢，停在侧放的画上
const RV = { t0: EN[1], stop: LS(83) + 1.6, go: LS(91) + 1.0 };
function riverOff(t) {
  const sp = t < LS(81) ? 1.6 : t < RV.stop ? lerp(1.6, 0, sstep(LS(81), RV.stop, t)) : t < RV.go ? 0 : lerp(0, .9, sstep(RV.go, RV.go + 2, t));
  // 积分（分段近似）
  let off = 0, tt = RV.t0; const dt = 1 / 30; while (tt < t) { const s = tt < LS(81) ? 1.6 : tt < RV.stop ? lerp(1.6, 0, sstep(LS(81), RV.stop, tt)) : tt < RV.go ? 0 : lerp(0, .9, sstep(RV.go, RV.go + 2, tt)); off += s * dt; tt += dt; }
  return off;
}
shot(EN[1], LS(92) - 0.6, {
  grain: .05, bloom: .3, bthr: .4,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
    const ord = ORDER(); if (!ord.length) return;
    // 停在「侧放的画」那一帧：把它放到河的最前面
    const ki = ord.findIndex(o => o[0] === 'kand');
    const off = riverOff(t) + (ki >= 0 ? ki - riverOff(RV.stop) : 0);
    const named = sstep(LS(84) - .3, LS(84) + .4, t) * (1 - sstep(LS(88) + .5, LS(89) - .5, t));
    const cracks = sstep(LS(88) + .3, LS(89), t) * (1 - sstep(LS(90) - .2, LS(90) + .3, t));
    const merge = sstep(LS(90) + .2, GP('new painting')[1] - .3, t) * (1 - sstep(LS(91) + .4, LS(91) + 1.4, t));
    const dimRiver = Math.max(named, cracks, merge);
    // 河
    ctx.save(); ctx.globalAlpha = 1 - dimRiver * .85;
    for (let i = Math.floor(off) + 9; i >= Math.floor(off) - 2; i--) { const k = ((i % ord.length) + ord.length) % ord.length; const [x, y, s] = riverAt(i, off); if (s <= 0) continue; frameCard(ctx, ord[k][1], x, y, s, clamp(1.3 - (i - off) * .1)); }
    ctx.restore();
    // 停住的那一帧亮一下
    const st = sstep(RV.stop - .6, RV.stop, t) * (1 - named);
    if (st > 0 && ki >= 0) { const [x, y, s] = riverAt(Math.round(off), off); frameCard(ctx, RIV.kand, x, y, s, 1, st); }
    // 四个名字、四帧排成一排
    if (named > 0) {
      const ts = [LS(84), LS(85), LS(86), LS(87)];
      NAMED.forEach((n, i) => { const a = sstep(ts[i] - .2, ts[i] + .3, t) * named; if (a <= 0) return; const x = 300 + i * 440; frameCard(ctx, RIV[n], x, 470, .9, a, a * (t < ts[i] + 1.5 ? 1 : .35)); txt(ctx, ['康定斯基', '梅里爱', '莱恩·莱', '村田健'][i], x, 690, { size: 44, align: 'center', color: '#FFE7A8', alpha: a }); });
    }
    // 完美的球和 AI 味的脸，各长出一道裂缝
    if (cracks > 0) {
      ctx.save(); ctx.globalAlpha = cracks;
      const im = G540.run('planet', { T: 2, P: 0, Q: 3.2 }); ctx.drawImage(im, 60, 230, 860, 484);
      ctx.fillStyle = '#0b0d14'; ctx.fillRect(1000, 230, 860, 484); if (window.A4X) A4X.perfectFace(ctx, 1430, 472, .95);
      ctx.restore();
      const cr = sstep(LS(89), LS(89) + 2.4, t);
      for (const cx0 of [490, 1430]) { ctx.save(); ctx.strokeStyle = `rgba(255,236,190,${cracks})`; ctx.lineWidth = 4; ctx.shadowColor = '#ffe9b0'; ctx.shadowBlur = 24; ctx.beginPath(); let x = cx0 - 30, y = 300; ctx.moveTo(x, y); const r = mulberry(cx0); for (let k = 0; k < 12 * cr; k++) { x += (r() - .5) * 50; y += 30; ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
    }
    // 四个意外重叠成一幅新画（不出金句卡）
    if (merge > 0) {
      ctx.save();
      NAMED.forEach((n, i) => { if (!RIV[n]) return; const p = sstep(LS(90) + .2 + i * .3, LS(90) + 2.4 + i * .3, t); const x = lerp(300 + i * 440, W / 2, p), y = lerp(470, H / 2, p), s = lerp(.9, 3.6, p);
        ctx.globalAlpha = merge * (p < 1 ? 1 : .55); ctx.globalCompositeOperation = i ? 'screen' : 'source-over'; ctx.drawImage(RIV[n], x - FW * s / 2, y - FH * s / 2, FW * s, FH * s); });
      ctx.restore();
    }
  }
});
// ---------- 一万只鹈鹕 ----------
const [ATL, ATx] = mk2d(96 * 10, 54 * 4);
let ATL_OK = false;
function makeAtlas() {
  if (ATL_OK) return; ATL_OK = true; const WS = window.COLDX ? COLDX.WORLDS : [];
  for (let k = 0; k < 40; k++) { const x = (k % 10) * 96, y = Math.floor(k / 10) * 54; ATx.save(); ATx.beginPath(); ATx.rect(x, y, 96, 54); ATx.clip();
    const hue = (k * 37) % 360; ATx.fillStyle = `hsl(${hue},40%,${18 + (k % 5) * 6}%)`; ATx.fillRect(x, y, 96, 54);
    pelican(ATx, x + 44, y + 50, .085, { ph: k, bad: k % 3 === 0 ? k : null, col: `hsl(${(hue + 180) % 360},60%,85%)`, lw: 12, wheel: 1 + (k % 4 === 1 ? .6 : 0) });
    ATx.restore(); }
}
const TK = { t0: LS(92) - 0.6, circ: LS(94) + 1.6, zoom: LS(95) - 0.3 };
const PICK = [57, 41], PICK_K = 22; // 被圈住的那一格（圈住之后不再闪）
shot(TK.t0, LS(98) - 0.5, {
  grain: .04, xin: .6,
  init() { makeAtlas(); },
  draw(ctx, lt, t) {
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const N = 100, cw = W / N, ch = H / N * 1.0;
    const zoom = ease.inout((t - TK.zoom) / 2.4);
    const cx = (PICK[0] + .5) * cw, cy = (PICK[1] + .5) * ch;
    const out = ease.inout((t - TK.t0) / 3.2); const sc = lerp(lerp(9, 1, out), W / (cw * 1.15), zoom);
    const dim = sstep(TK.circ, TK.circ + .6, t);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-lerp(lerp(cx, W / 2, out), cx, zoom), -lerp(lerp(cy, H / 2, out), cy, zoom));
    const appear = 1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if ((i + j * 1.3) / (N * 2.3) > appear) continue;
      const pick = i === PICK[0] && j === PICK[1]; const k = pick && t > TK.circ - .4 ? PICK_K : (i * 7 + j * 13 + Math.floor(t * 4 + (i ^ j))) % 40;
      ctx.globalAlpha = pick ? 1 : 1 - dim * .85;
      ctx.drawImage(ATL, (k % 10) * 96, Math.floor(k / 10) * 54, 96, 54, i * cw, j * ch, cw - .6, ch - .6);
    }
    ctx.restore(); ctx.globalAlpha = 1;
    // 手绘的圈
    const ca = sstep(TK.circ - .4, TK.circ + .4, t) * (1 - zoom);
    if (ca > 0) { const px = W / 2 + (cx - W / 2) * 1, py = cy; ctx.save(); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.beginPath(); for (let a = 0; a <= 6.6 * ca; a += .1) { const r = 34 + Math.sin(a * 3) * 3 + a * 1.2; const X = px + Math.cos(a - 1) * r * 1.3, Y = py + Math.sin(a - 1) * r; a ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.restore(); }
    txt(ctx, '10,000', 80, 140, { size: 80, font: FONT.grot, w: 600, color: '#fff', alpha: sstep(TK.t0 + .5, TK.t0 + 1, t) * (1 - sstep(TK.circ - .5, TK.circ, t)), shadow: 'rgba(0,0,0,.9)' });
    // 放大后换成全分辨率重画同一只（不是把小图放大）
    if (zoom > .6) { const k = PICK_K, hue = (k * 37) % 360; ctx.save(); ctx.globalAlpha = sstep(.6, .95, zoom); ctx.fillStyle = `hsl(${hue},40%,${18 + (k % 5) * 6}%)`; ctx.fillRect(0, 0, W, H);
      pelican(ctx, W * .44, H * .9, .085 * W / 96 * 1.0, { ph: t * 4, col: `hsl(${(hue + 180) % 360},60%,85%)`, lw: 12 }); ctx.restore(); }
    // 放大之后：被圈住的那一只占满全屏，数字卡依次落下
    if (zoom > .98) {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
      const ST = typeof STATS !== 'undefined' ? STATS : { lines: 0, hours: 0, log: [] };
      // L96：把「没看过画面动起来」变成文字之城的，是它自己 → 切回文字之城
      const tcA = sstep(LS(96) - .3, LS(96) + .2, t) * (1 - sstep(LS(97) - .2, LS(97) + .3, t));
      const tcIm = RIV.tcplanet || RIV.tcrings;
      if (tcA > 0 && tcIm) { ctx.save(); ctx.globalAlpha = Math.min(1, tcA * 1.6); ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = tcA; const z = 1.38 + (t - LS(96)) * .02; ctx.drawImage(tcIm, W - W * z, H - H * z, W * z, H * z); ctx.restore(); txt(ctx, '文字之城 · 它自己选的画法', 80, 130, { size: 44, color: '#fff', alpha: tcA, shadow: 'rgba(0,0,0,.9)' }); }
      const l97 = t - LS(97);
      // 渲染日志滚动
      ctx.save(); ctx.globalAlpha = .4 * (1 - Math.min(1, tcA * 2)); const LG = ST.log || [], nL = Math.max(1, LG.length); for (let r = 0; r < 22; r++) { const sc = (t - TK.zoom) * 3; const idx = Math.floor(sc) + r; const y = 150 + r * 40 - (sc % 1) * 40; txt(ctx, LG[idx % nL] || '', 80, y, { size: 30, font: FONT.mono, color: '#9fe6ff' }); } ctx.restore();
      if (l97 > 0) {
        const a1 = sstep(0, .5, l97), a2 = sstep(1.2, 1.7, l97);
        ctx.save(); ctx.globalAlpha = a1; ctx.fillStyle = 'rgba(6,8,14,.88)'; ctx.fillRect(1100, 300 - (1 - a1) * 60, 700, 170); ctx.restore();
        txt(ctx, `${ST.lines.toLocaleString()} 行代码`, 1140, 410 - (1 - a1) * 60, { size: 76, w: 700, color: '#FFE7A8', alpha: a1 });
        ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = 'rgba(6,8,14,.88)'; ctx.fillRect(1100, 520 - (1 - a2) * 60, 700, 170); ctx.restore();
        txt(ctx, `约 ${ST.hours} 小时渲染`, 1140, 630 - (1 - a2) * 60, { size: 76, w: 700, color: '#FFE7A8', alpha: a2 });
        txt(ctx, ST.where || '', 1140, 730, { size: 32, color: 'rgba(255,255,255,.7)', alpha: a2 });
      }
    }
  }
});
// ---------- 它做的 / 我做的 ----------
shot(LS(98) - 0.5, LS(99) - 0.4, {
  grain: .04, xin: .5,
  draw(ctx, lt, t) {
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
    const cols = [['它做的', '#9fe6ff', ['查资料、核对史实', '写每一个镜头的代码', '渲染', '对齐口播和音乐']], ['我做的', '#FFE7A8', ['选题', '录音', '哪一版好看', '哪里重做']], ['它还做不到的', 'rgba(255,255,255,.55)', ['真实的人脸', '角色的表演']]];
    cols.forEach(([h, c, items], i) => { const x = 160 + i * 560; const a0 = .3 + i * 1.3; txt(ctx, h, x, 260, { size: 60, w: 700, color: c, alpha: sstep(a0, a0 + .4, lt) });
      items.forEach((s, j) => txt(ctx, '· ' + s, x, 370 + j * 90, { size: 44, color: '#e9e4d8', alpha: sstep(a0 + .3 + j * .25, a0 + .6 + j * .25, lt) })); });
  }
});
// ---------- 风格库 + 一句话 ----------
shot(LS(99) - 0.4, LS(102) - 0.6, {
  grain: .04, xin: .5,
  draw(ctx, lt, t, f) {
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
    const WS = window.COLDX ? COLDX.WORLDS : [];
    const show = 1 - sstep(LS(101) - .3, LS(101) + .3, t);
    if (show > 0 && WS.length) {
      // 风格库墙：每种画法一个小窗，同时在动
      const [mc, mx] = MINI; const nx = 5, ny = 4, w = 330, h = 186;
      for (let k = 0; k < 20; k++) { const i = k % nx, j = Math.floor(k / nx); const x = 120 + i * (w + 22), y = 150 + j * (h + 22);
        if (k / 20 > clamp(lt / 2)) continue;
        if ((f + k) % 3 === 0 || !MINI_CACHE[k]) { mx.setTransform(1, 0, 0, 1, 0, 0); try { COLDX.renderWorld(mx, k, t, f, 1); } catch (e) { } if (!MINI_CACHE[k]) MINI_CACHE[k] = mk2d(w, h); MINI_CACHE[k][1].drawImage(mc, 0, 0, w, h); }
        ctx.save(); ctx.globalAlpha = show * (t > LS(100) ? .35 : 1); ctx.drawImage(MINI_CACHE[k][0], x, y); ctx.restore(); }
      txt(ctx, '本片的 20 种画法 + 鹈鹕', 120, 110, { size: 40, color: '#e9e4d8', alpha: show });
      // 一句话 → 10 秒片头
      const l100 = t - LS(100);
      if (l100 > 0) { const s = '用演示场景的风格做个 10 秒片头'; const n = Math.floor(clamp(l100 / 1.6) * s.length);
        ctx.save(); ctx.globalAlpha = show; ctx.fillStyle = 'rgba(8,10,16,.92)'; ctx.beginPath(); ctx.roundRect(260, 380, 1400, 330, 18); ctx.fill(); ctx.strokeStyle = 'rgba(242,196,109,.5)'; ctx.stroke(); ctx.restore();
        txt(ctx, '> ' + s.slice(0, n), 310, 470, { size: 50, color: '#FFE7A8', alpha: show });
        const steps = ['写代码', '渲染', 'demo_intro.mp4 · 10 秒'];
        steps.forEach((s2, i) => txt(ctx, '→ ' + s2, 330 + i * 430, 600, { size: 42, font: FONT.sans, color: '#9fe6ff', alpha: show * sstep(2 + i * .7, 2.4 + i * .7, l100) }));
      }
    }
    // 简介区
    const l101 = t - LS(101);
    if (l101 > -0.3) { const a = sstep(-.3, .3, l101); txt(ctx, '全部免费放在简介区', W / 2, 400, { size: 80, w: 700, align: 'center', color: '#FFE7A8', alpha: a });
      ['代码', 'SKILL', '史料来源', '配乐说明'].forEach((s, i) => { const x = W / 2 + (i - 1.5) * 400; ctx.save(); ctx.globalAlpha = a * sstep(.3 + i * .2, .6 + i * .2, l101); ctx.strokeStyle = 'rgba(255,231,168,.6)'; ctx.lineWidth = 2; ctx.strokeRect(x - 170, 520, 340, 120); ctx.restore(); txt(ctx, s, x, 600, { size: 48, align: 'center', color: '#e9e4d8', alpha: a * sstep(.3 + i * .2, .6 + i * .2, l101) }); }); }
  }
});
const MINI = mk2d(), MINI_CACHE = [];
// ---------- 鹈鹕从编辑器里骑出来，倒着骑过所有画框，骑进一张空白画布 ----------
const FIN = { t0: LS(102) - 0.6, back0: LS(102) + .2, canvas: LE(103) + .3, end: EN[2] };
shot(FIN.t0, FIN.end, {
  grain: .04, xin: .4, tag: false,
  draw(ctx, lt, t, f) {
    const WS = window.COLDX ? COLDX.WORLDS : [];
    const per = .3, k = Math.floor((t - FIN.back0) / per);
    if (t < FIN.canvas && WS.length) {
      const idx = t < FIN.back0 ? 19 : Math.max(0, 19 - k);
      COLDX.renderWorld(ctx, idx, t, f, 1);
      eraTag(ctx, WS[idx].era[0], WS[idx].era[1], .8);
      if ((t - FIN.back0) % per < .04) flash(ctx, .2);
      return;
    }
    // 空白画布 + 光标
    const l = t - FIN.canvas;
    ctx.fillStyle = '#f2ede2'; ctx.fillRect(0, 0, W, H);
    const pa = 1 - sstep(.0, 1.4, l);
    if (pa > 0) pelican(ctx, lerp(W * .45, W * .62, ease.out(l / 1.4)), H * .83, .5, { ph: t * 6, col: '#ffffff', lw: 7, line: `rgba(29,36,48,${pa})`, beak: `rgba(242,163,58,${pa})`, pouch: `rgba(247,196,107,${pa})` });
    const blink3 = l > 1.6 && l < 4.6 ? (Math.floor((l - 1.6) * 2) % 2 === 0) : l <= 1.6;
    const ca = 1 - sstep(5.4, 6.2, l);
    if (blink3 && ca > 0) { ctx.fillStyle = `rgba(29,36,48,${ca})`; ctx.fillRect(W / 2 - 4, H / 2 - 40, 8, 80); }
    // 署名 + 参考资料
    const sa = sstep(4.6, 5.4, l) * (1 - sstep(8.6, 9.4, l));
    txt(ctx, 'T8star  ×  Claude', W / 2, H / 2 + 20, { size: 80, font: FONT.disp, w: 600, align: 'center', color: '#1d2430', alpha: sa });
    txt(ctx, '本片由 T8star 和 Claude 制作 · 非商单 · 代码开源', W / 2, H / 2 + 110, { size: 38, align: 'center', color: 'rgba(29,36,48,.7)', alpha: sa });
    const ra = sstep(9.4, 10.2, l);
    if (ra > 0) {
      const REF = ['参考资料', 'Plateau：Science Museum Group / Wikipedia「Phenakistiscope」', '梅里爱：《La Revue du cinéma》1929 年刊载的本人回忆', '康定斯基：《Retrospects》（Guggenheim 1945 英译）', '莱恩·莱：Te Ara 新西兰传记辞典', '惠特尼：ACM SIGGRAPH 数字艺术档案 / Rhizome', '佩林：SIGGRAPH 2002 课程讲义 ch4；NYU 本人页面', '演示场景：德国联合国教科文组织委员会；Art of Coding', 'Elevated / Shadertoy：Pouët；shadertoy.com/about', '村田健《Monster Movie》：史密森尼美国艺术博物馆', 'Sora：OpenAI（2024.2）；鹈鹕测试：Simon Willison（2024）', '致敬：撒哈拉岩画、汉画像石、宋画、北斋、梵高、蒙克（均已进入公有领域，仅借用画法）', '配乐：Suno v6 生成的原创纯音乐 · 字体：思源 / JetBrains Mono / Cormorant'];
      const y0 = H + 40 - (l - 9.4) * 95;
      REF.forEach((s, i) => txt(ctx, s, W / 2, y0 + i * 70, { size: i ? 34 : 50, w: i ? 400 : 700, align: 'center', color: '#1d2430', alpha: ra }));
    }
    fadeBlack(ctx, sstep(FIN.end - 1.2, FIN.end, t) * 0);
  }
});
})();
