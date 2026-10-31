// ---------- 粒子流场 ----------
class Flow {
  constructor(o) {
    Object.assign(this, { n: 30000, seed: 1, sc: 0.0015, spd: 2.4, ts: 0.15, life: [80, 220], fade: 0.075, bg: [7, 10, 18], cols: ['rgba(242,196,109,0.55)', 'rgba(237,230,214,0.45)', 'rgba(255,170,90,0.45)', 'rgba(111,211,255,0.35)'], w: 1.1, transparent: false, comp: 'source-over' }, o);
    [this.cv, this.cx] = mk2d(); if (this.split) [this.cv2, this.cx2] = mk2d();
  }
  init() {
    const N = this.n; this.r = mulberry(this.seed);
    this.x = new Float32Array(N); this.y = new Float32Array(N); this.px = new Float32Array(N); this.py = new Float32Array(N);
    this.dx = new Float32Array(N); this.dy = new Float32Array(N); this.age = new Float32Array(N); this.lf = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.spawn(i); this.age[i] = this.r() * this.lf[i]; }
    const c = this.cx; c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.transparent) c.clearRect(0, 0, W, H); else { c.fillStyle = `rgb(${this.bg})`; c.fillRect(0, 0, W, H); }
    if (this.cx2) this.cx2.clearRect(0, 0, W, H);
    this.f = -1;
  }
  spawn(i) { const p = this.spawnPos ? this.spawnPos(this.r) : [this.r() * W, this.r() * H]; this.x[i] = p[0]; this.y[i] = p[1]; this.age[i] = 0; this.lf[i] = lerp(this.life[0], this.life[1], this.r()); this.dx[i] = this.x[i]; this.dy[i] = this.y[i]; }
  vel(x, y, tt) {
    const s = this.sc, e = 2;
    const a = noise3(x * s, (y + e) * s, tt), b = noise3(x * s, (y - e) * s, tt), c = noise3((x + e) * s, y * s, tt), d = noise3((x - e) * s, y * s, tt);
    const k = this.spd / (2 * e * s); return [(a - b) * k, -(c - d) * k];
  }
  step(f, lt) {
    const c = this.cx, N = this.n, nb = this.cols.length, tt = f / FPS * this.ts;
    const fd = this.fadeAt ? this.fadeAt(lt) : this.fade;
    const c2 = this.cx2; if (c2) { c2.globalCompositeOperation = 'destination-out'; c2.fillStyle = `rgba(0,0,0,${fd})`; c2.fillRect(0, 0, W, H); c2.globalCompositeOperation = this.comp; c2.lineWidth = this.w; c2.lineCap = 'round'; }
    if (this.transparent) { c.globalCompositeOperation = 'destination-out'; c.fillStyle = `rgba(0,0,0,${fd})`; c.fillRect(0, 0, W, H); }
    else { c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(${this.bg},${fd})`; c.fillRect(0, 0, W, H); }
    c.globalCompositeOperation = this.comp; c.lineWidth = this.w; c.lineCap = 'round';
    const ga = this.alphaAt ? this.alphaAt(lt) : 1; c.globalAlpha = ga;
    for (let b = 0; b < nb; b++) {
      c.strokeStyle = this.cols[b]; c.beginPath(); const pb = c2 ? new Path2D() : null;
      for (let i = b; i < N; i += nb) {
        let x = this.x[i], y = this.y[i];
        const v = this.velFn ? this.velFn(x, y, tt, i) : this.vel(x, y, tt);
        if (this.target) {
          const w = this.target(i, lt);
          if (!this.vx) { this.vx = new Float32Array(N); this.vy = new Float32Array(N); }
          const vx = lerp(v[0], this.vx[i] * 0.86 + (this.tx[i] - x) * 0.018, w), vy = lerp(v[1], this.vy[i] * 0.86 + (this.ty[i] - y) * 0.018, w);
          this.vx[i] = vx; this.vy[i] = vy; x += vx; y += vy;
        } else { x += v[0]; y += v[1]; }
        this.x[i] = x; this.y[i] = y; this.age[i]++;
        const X = x, Y = y;
        const ox = this.dx[i], oy = this.dy[i];
        if (this.age[i] > 1 && Math.abs(X - ox) < 200 && Math.abs(Y - oy) < 200) {
          let sx = ox, sy = oy; const sl = Math.hypot(X - ox, Y - oy), cap = this.cap || 1e9; if (sl > cap) { sx = X - (X - ox) / sl * cap; sy = Y - (Y - oy) / sl * cap; }
          if (pb && this.backFn(X, Y)) { pb.moveTo(sx, sy); pb.lineTo(X, Y); } else { c.moveTo(sx, sy); c.lineTo(X, Y); }
        }
        this.dx[i] = X; this.dy[i] = Y;
        const out = !this.target && (x < -20 || x > W + 20 || y < -20 || y > H + 20);
        if (out || (!this.target && this.age[i] > this.lf[i])) this.spawn(i);
      }
      c.stroke(); if (pb) { c2.globalAlpha = ga; c2.strokeStyle = this.cols[b]; c2.stroke(pb); }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; if (c2) { c2.globalAlpha = 1; c2.globalCompositeOperation = 'source-over'; }
  }
}
// ---------- 1982 机器世界 ----------
const POLY = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const ico = { v: [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(p => p.map(x => x / Math.hypot(1, t))), f: [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]] };
  const cube = { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(p => p.map(x => x * .62)), f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] };
  const oct = { v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], f: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [0, 4, 3], [4, 1, 3], [1, 5, 3], [5, 0, 3]] };
  const pyr = { v: [[0, 1.1, 0], [-.9, -.6, -.9], [.9, -.6, -.9], [.9, -.6, .9], [-.9, -.6, .9]], f: [[1, 2, 3, 4], [0, 2, 1], [0, 3, 2], [0, 4, 3], [0, 1, 4]] };
  return { ico, cube, oct, pyr };
})();
const WORLD = [
  { k: 'sphere', p: [-7, 3.2, 26], r: 2.6, col: [80, 200, 255] },
  { k: 'cube', p: [7.5, 2.6, 34], s: 2.4, col: [255, 95, 162], rs: [.5, .8] },
  { k: 'pyr', p: [-9, 2.4, 46], s: 2.6, col: [255, 170, 60], rs: [0, .6] },
  { k: 'ico', p: [8, 4.2, 54], s: 2.6, col: [111, 211, 255], rs: [.35, .5] },
  { k: 'oct', p: [-4, 5.2, 66], s: 2.2, col: [190, 120, 255], rs: [.6, .9] },
  { k: 'sphere', p: [6, 2.8, 78], r: 2.4, col: [255, 120, 180] },
  { k: 'cube', p: [-8, 2.2, 88], s: 2, col: [111, 255, 200], rs: [.7, .4] },
];
function draw1982(ctx, cam, tt, opts = {}) {
  const F = 1050, HZ = H * 0.46;
  const pr = (x, y, z) => { const dz = z - cam.z; if (dz < 0.6) return null; return [W / 2 + (x - cam.x) * F / dz, HZ - (y - cam.y) * F / dz, F / dz]; };
  // 天空：完美渐变
  let g = ctx.createLinearGradient(0, 0, 0, HZ); g.addColorStop(0, '#000004'); g.addColorStop(.55, '#0a0626'); g.addColorStop(1, '#3a0d4f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ);
  g = ctx.createLinearGradient(0, HZ, 0, H); g.addColorStop(0, '#0b0418'); g.addColorStop(1, '#000003'); ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);
  // 远山线框
  ctx.save(); ctx.strokeStyle = 'rgba(255,95,200,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
  const ox = -cam.x * 3; let first = true;
  for (let i = -16; i <= 16; i++) {
    const x = W / 2 + i * 70 + ox; const pk = 40 + 60 * Math.abs(Math.sin(i * 1.7)) + 30 * Math.abs(Math.sin(i * 0.53));
    const y = (i % 2 === 0) ? HZ - pk : HZ - 6;
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = -16; i <= 16; i += 2) { const x = W / 2 + i * 70 + ox; const pk = 40 + 60 * Math.abs(Math.sin(i * 1.7)) + 30 * Math.abs(Math.sin(i * 0.53)); ctx.moveTo(x, HZ - pk); ctx.lineTo(x, HZ); }
  ctx.stroke(); ctx.restore();
  // 地平线光
  g = ctx.createLinearGradient(0, HZ - 30, 0, HZ + 30); g.addColorStop(0, 'rgba(255,80,200,0)'); g.addColorStop(.5, 'rgba(255,120,220,0.5)'); g.addColorStop(1, 'rgba(255,80,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, HZ - 30, W, 60);
  // 网格地面
  const zn = cam.z + 0.8, zf = cam.z + 240;
  const line = (a, b, al, w) => { if (!a || !b) return; ctx.globalAlpha = al; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  ctx.save(); ctx.strokeStyle = '#6FD3FF';
  for (let x = -100; x <= 100; x += 5) line(pr(x, 0, zn), pr(x, 0, zf), 0.5, 1.2);
  for (let z = Math.ceil(zn / 5) * 5; z < zf; z += 5) { const d = z - cam.z; line(pr(-100, 0, z), pr(100, 0, z), clamp(1.2 - d / 200) * 0.75, d < 30 ? 1.8 : 1.1); }
  ctx.restore(); ctx.globalAlpha = 1;
  // 物体（远到近）
  const items = WORLD.filter(o => o.p[2] - cam.z > 1.2).sort((a, b) => b.p[2] - a.p[2]);
  const L = [-.5, .7, -.5]; const ll = Math.hypot(...L); const Ln = L.map(v => v / ll);
  for (const o of items) {
    const [x, y, z] = o.p; const c = pr(x, y, z); if (!c) continue;
    // 地面完美影子
    const sh = pr(x, 0, z); if (sh) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], (o.r || o.s) * c[2] * 0.9, (o.r || o.s) * c[2] * 0.18, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (o.k === 'sphere') {
      const R = o.r * c[2]; const gg = ctx.createRadialGradient(c[0] - R * .35, c[1] - R * .4, R * .05, c[0], c[1], R);
      const [r, g2, b] = o.col; gg.addColorStop(0, '#ffffff'); gg.addColorStop(.18, `rgb(${r},${g2},${b})`); gg.addColorStop(.85, `rgb(${r * .25 | 0},${g2 * .25 | 0},${b * .35 | 0})`); gg.addColorStop(1, `rgb(${r * .1 | 0},${g2 * .1 | 0},${b * .2 | 0})`);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(c[0], c[1], R, 0, 7); ctx.fill();
      continue;
    }
    const P = POLY[o.k]; const ay = tt * o.rs[1] + o.p[2], ax = tt * o.rs[0];
    const rot = v => { let [a, b, cc] = v; let X = a * Math.cos(ay) + cc * Math.sin(ay), Z = -a * Math.sin(ay) + cc * Math.cos(ay); let Y = b * Math.cos(ax) - Z * Math.sin(ax); Z = b * Math.sin(ax) + Z * Math.cos(ax); return [X * o.s + x, Y * o.s + y, Z * o.s + z]; };
    const V = P.v.map(rot); const S2 = V.map(v => pr(...v)); if (S2.some(s => !s)) continue;
    const faces = P.f.map(f => { const a = V[f[0]], b = V[f[1]], d = V[f[2]]; const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const nl = Math.hypot(...n); n = n.map(q => q / nl); const cz = f.reduce((s, i) => s + V[i][2], 0) / f.length; const cxw = f.reduce((s, i) => s + V[i][0], 0) / f.length, cyw = f.reduce((s, i) => s + V[i][1], 0) / f.length; const view = [cxw - cam.x, cyw - cam.y, cz - cam.z]; return { f, n, cz, vis: n[0] * view[0] + n[1] * view[1] + n[2] * view[2] }; });
    faces.filter(q => q.vis < 0).sort((a, b) => b.cz - a.cz).forEach(q => {
      const lam = Math.max(0, q.n[0] * Ln[0] + q.n[1] * Ln[1] + q.n[2] * Ln[2]); const k = 0.18 + 0.82 * lam; const [r, g2, b] = o.col;
      ctx.fillStyle = `rgb(${r * k | 0},${g2 * k | 0},${b * k | 0})`; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
      ctx.beginPath(); q.f.forEach((i, j) => j ? ctx.lineTo(S2[i][0], S2[i][1]) : ctx.moveTo(S2[i][0], S2[i][1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }
  // 扫描线
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#000'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); ctx.restore();
}
// ---------- 目标文字点（标题收拢） ----------
function textPoints(lines, n, seed) {
  const [c, x] = mk2d(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(l => { x.font = `${l.w || 900} ${l.size}px ${l.font || FONT.serif}`; x.fillText(l.s, W / 2, l.y); });
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (d[(yy * W + xx) * 4] > 128) pts.push([xx, yy]);
  const r = mulberry(seed), tx = new Float32Array(n), ty = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = pts[Math.floor(r() * pts.length)]; tx[i] = p[0] + (r() - .5) * 1.5; ty[i] = p[1] + (r() - .5) * 1.5; }
  return [tx, ty];
}
