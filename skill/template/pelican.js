// ===== 骑自行车的鹈鹕（原创造型，纯代码） =====
// pelican(ctx, x, y, s, o)：x,y = 两轮中点的地面位置；s = 缩放（1 ≈ 宽 520px）
// o: { ph 脚踏相位, wheel 车轮倍数, col 主色, line 线色, lw 线宽, fill 是否填色, pouch 喉囊色, beak 喙色, bad 翻车种子, flat 平涂 }
function pelican(ctx, x, y, s, o = {}) {
  const ph = o.ph || 0, wk = o.wheel == null ? 1 : o.wheel, lw = (o.lw || 7) / s;
  const L = o.line || '#1d2430', B = o.col || '#f4f1ea', BK = o.beak || '#f2a33a', PO = o.pouch || '#f7c46b', fill = o.fill !== false;
  const bad = o.bad, R = bad != null ? mulberry(bad * 7919 + 13) : null, flaw = k => bad != null && ((bad * 31 + k * 17) % 7) < 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = L;
  const wr = 95 * wk, wy = -wr;                     // 车轮半径与轮心高度
  const fx = -170, rx = 170;                        // 前轮在左？——鹈鹕朝右骑：后轮左、前轮右
  const sp = (wk - 1) * 90; const back = [-170 - sp, wy], front = [170 + sp, wy];
  const seat = [-40, wy - 150 - (wk - 1) * 30], crank = [-10, wy + 5], bar = [130, wy - 175 - (wk - 1) * 30];
  // 车轮
  const wheel = (c, sq) => {
    ctx.save(); ctx.translate(c[0], c[1]);
    if (sq) { ctx.strokeRect(-wr, -wr, wr * 2, wr * 2); }
    else { ctx.beginPath(); ctx.arc(0, 0, wr, 0, 7); ctx.stroke(); ctx.save(); ctx.lineWidth = lw * .45; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + ph; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * wr, Math.sin(a) * wr); ctx.stroke(); } ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fillStyle = L; ctx.fill(); ctx.restore();
  };
  if (flaw(0)) ctx.rotate(-0.25);
  wheel(back, flaw(1)); wheel(front, flaw(2) && !flaw(1));
  // 车架
  ctx.beginPath(); ctx.moveTo(back[0], back[1]); ctx.lineTo(crank[0], crank[1]); ctx.lineTo(seat[0] + 10, seat[1] + 20); ctx.lineTo(back[0], back[1]);
  ctx.moveTo(crank[0], crank[1]); ctx.lineTo(bar[0] - 20, bar[1] + 30); ctx.lineTo(seat[0] + 10, seat[1] + 20); ctx.moveTo(bar[0] - 20, bar[1] + 30); ctx.lineTo(front[0], front[1]);
  ctx.moveTo(bar[0] - 20, bar[1] + 30); ctx.lineTo(bar[0], bar[1]); ctx.lineTo(bar[0] + 30, bar[1] - 6); ctx.stroke();
  ctx.save(); ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.moveTo(seat[0] - 25, seat[1]); ctx.lineTo(seat[0] + 30, seat[1]); ctx.stroke(); ctx.restore();
  // 脚踏
  const pr = 34; const p1 = [crank[0] + Math.cos(ph) * pr, crank[1] + Math.sin(ph) * pr], p2 = [crank[0] - Math.cos(ph) * pr, crank[1] - Math.sin(ph) * pr];
  ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  // 身体
  const body = [seat[0] + 10, seat[1] - 70];
  const fillOrStroke = () => { if (fill) { ctx.fillStyle = B; ctx.fill(); } ctx.stroke(); };
  // 腿（膝盖弯折到脚踏）
  const hip = [body[0] + 20, body[1] + 40];
  for (const [pp, k] of [[p2, 0], [p1, 1]]) {
    let tx = pp[0], ty = pp[1]; if (flaw(3) && k) { tx += 60; ty -= 120; }   // 翻车：脚踩在空气里
    const mx = (hip[0] + tx) / 2 + 40, my = (hip[1] + ty) / 2 - 10;
    ctx.save(); ctx.strokeStyle = BK; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 16, ty + 4); ctx.lineTo(tx + 22, ty + 4); ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(body[0], body[1], 105, 62, -0.18, 0, 7); fillOrStroke();
  // 尾巴
  ctx.beginPath(); ctx.moveTo(body[0] - 95, body[1] - 5); ctx.lineTo(body[0] - 150, body[1] - 30); ctx.lineTo(body[0] - 110, body[1] + 25); ctx.closePath(); fillOrStroke();
  // 翅膀
  const wf = Math.sin(ph * 0.5) * 6;
  ctx.beginPath(); ctx.moveTo(body[0] - 50, body[1] - 20); ctx.quadraticCurveTo(body[0] + 10, body[1] - 70 + wf, body[0] + 70, body[1] - 25); ctx.quadraticCurveTo(body[0] + 10, body[1] + 25, body[0] - 60, body[1] + 10); ctx.closePath(); fillOrStroke();
  ctx.save(); ctx.lineWidth = lw * .5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(body[0] - 40 + k * 25, body[1] - 5); ctx.lineTo(body[0] - 10 + k * 25, body[1] + 12); ctx.stroke(); } ctx.restore();
  // 脖子 + 头
  let neck0 = [body[0] + 70, body[1] - 30], head = [body[0] + 120, body[1] - 175];
  if (flaw(4)) { head = [bar[0] + 30, bar[1] - 40]; }                        // 翻车：脖子长在车把上
  ctx.save(); ctx.lineWidth = 34 / 1; ctx.strokeStyle = L; ctx.beginPath(); ctx.moveTo(neck0[0], neck0[1]); ctx.bezierCurveTo(neck0[0] + 50, neck0[1] - 40, head[0] - 60, head[1] + 70, head[0], head[1]); ctx.stroke();
  if (fill) { ctx.lineWidth = 34 - lw * 2; ctx.strokeStyle = B; ctx.stroke(); } ctx.restore();
  ctx.beginPath(); ctx.arc(head[0], head[1], 36, 0, 7); fillOrStroke();
  // 眼
  ctx.fillStyle = L; ctx.beginPath(); ctx.arc(head[0] + 10, head[1] - 8, o.blink ? 1.5 : 6, 0, 7); ctx.fill();
  if (o.blink) { ctx.beginPath(); ctx.moveTo(head[0] + 2, head[1] - 8); ctx.lineTo(head[0] + 18, head[1] - 8); ctx.stroke(); }
  // 喙 + 喉囊
  const dir = flaw(5) ? -1 : 1;
  ctx.save(); ctx.translate(head[0] + 20 * dir, head[1]); ctx.scale(dir, 1);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(190, 8); ctx.lineTo(0, 10); ctx.closePath(); ctx.fillStyle = BK; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 10); ctx.quadraticCurveTo(80, 75, 180, 12); ctx.closePath(); ctx.fillStyle = PO; if (fill || true) ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
// 平滑的鹈鹕外轮廓点（给粒子 / 字符 / 线条造型用）：画在离屏上取边缘点
function pelicanPoints(n, seed, s = 1.6) {
  const [c, x] = mk2d(); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  pelican(x, W / 2, H * .82, s, { col: '#fff', line: '#fff', beak: '#fff', pouch: '#fff', lw: 10 });
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let yy = 0; yy < H; yy += 3) for (let xx = 0; xx < W; xx += 3) if (d[(yy * W + xx) * 4] > 128) pts.push([xx, yy]);
  const r = mulberry(seed), out = []; for (let i = 0; i < n; i++) out.push(pts[Math.floor(r() * pts.length)]); return out;
}
