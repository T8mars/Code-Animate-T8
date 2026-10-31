// scene.js（镜头骨架写法）—— 10 秒示例：用 shots.js 只写镜头，不自己写 renderFrame。
// 用法：cp ../examples/shots_scene.js scene.js && node snap.js snaps 1 4 8 && node render.js 0 10 out.mp4
//       或并行分段：python3 rq.py 0 10 --chunk 3 --workers 2 --out render_demo
// 演示：
//   1) 口播时间表 setTimeline + LS/LE/GP：镜头切点跟着句子走，改了口播只要换时间表。
//   2) 有状态镜头 state：粒子拖尾（每帧在上一帧的画布上继续画），带 snapshot/restore，跳着截图也和顺序渲染一致。
//   3) xin 交叉溶解、bloom、grain、角标 filmOptions({tags:true})。
//   4) centerIn + pelican() 的包围盒：鹈鹕永远在画板正中，画板挪了也不用改常量。
//   5) smoothTrack：沿颠簸地面骑行，镜头高度用平滑后的「前方地面最高点」，不会上下抖。

setTimeline({   // 假装有三句口播（秒）；真片子里由口播对齐脚本生成
  lines: { 1: [0.6, 2.8], 2: [3.6, 6.0], 3: [6.6, 9.2] },
  gaps: [[2.8, 3.6, 'breath'], [9.2, 10.0, 'end']],
});
filmOptions({ tags: true });

// ---- 镜头 1：标题（0 → 第 2 句开始） ----
shot(0, LS(2), {
  grain: .05,
  draw(ctx, lt) {
    ctx.fillStyle = '#0b0f1a'; ctx.fillRect(0, 0, W, H);
    const a = sstep(0.2, 0.8, lt);
    txt(ctx, 'SHOTS.JS', W / 2, 520, { size: 150, w: 700, font: FONT.mono, align: 'center', color: C.gold, alpha: a, shadow: 'rgba(242,196,109,.5)', blur: 30 });
    txt(ctx, '只写镜头，时间跟着口播走', W / 2, 640, { size: 48, font: FONT.sans, align: 'center', color: C.cream, alpha: sstep(LS(1), LS(1) + .6, lt) });
  }
});

// ---- 镜头 2：有状态的粒子拖尾（第 2 句） ----
const TRAIL = {
  n: 2500, every: 30,
  init() { const r = mulberry(7); this.p = new Float32Array(this.n * 2); for (let i = 0; i < this.n; i++) { this.p[i * 2] = r() * W; this.p[i * 2 + 1] = r() * H; }
    if (!this.cv) [this.cv, this.cx] = mk2d(); this.cx.fillStyle = '#05070c'; this.cx.fillRect(0, 0, W, H); },
  step(f, lt) {   // 每帧：画布整体压暗一点（形成拖尾），粒子沿噪声流场走一步
    const c = this.cx, p = this.p; c.fillStyle = 'rgba(5,7,12,.08)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(242,196,109,.55)'; c.lineWidth = 1.6; c.beginPath();
    for (let i = 0; i < this.n; i++) { const x = p[i * 2], y = p[i * 2 + 1], a = noise3(x * .0015, y * .0015, lt * .3) * 6.28;
      const nx = x + Math.cos(a) * 4, ny = y + Math.sin(a) * 4; c.moveTo(x, y); c.lineTo(nx, ny);
      p[i * 2] = (nx + W) % W; p[i * 2 + 1] = (ny + H) % H; }
    c.stroke();
  },
  snapshot() { return { p: this.p.slice(), img: this.cx.getImageData(0, 0, W, H) }; },
  restore(s) { this.p = s.p.slice(); this.cx.putImageData(s.img, 0, 0); },
};
shot(LS(2), LE(2) + .3, {
  state: TRAIL, xin: .5, bloom: .35, grain: .04,
  draw(ctx, lt, t, f, st) {
    ctx.drawImage(st.cv, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(120, 860, 900, 90);
    txt(ctx, 'state：从镜头起点按帧号重放', 150, 920, { size: 44, font: FONT.sans, color: C.cream });
  }
});

// ---- 镜头 3：鹈鹕在画板正中，沿颠簸地面骑行，镜头高度平滑 ----
const ground = x => 60 * Math.sin(x * .004) + 25 * Math.sin(x * .013 + 1) + 14 * Math.sign(Math.sin(x * .031));   // 带台阶的地形（跳变）
const RIDE = 340;                                       // 骑行速度 px/秒
const camY = smoothTrack(lt => { let g = -1e9; for (let dx = -200; dx <= 600; dx += 40) g = Math.max(g, ground(lt * RIDE + dx)); return g; },
  0, 4, { dt: 1 / 30, maxWin: 1.2, win: .4, passes: 4 });
const rideY = smoothTrack(lt => ground(lt * RIDE), 0, 4, { dt: 1 / 30, win: .12, passes: 3 });   // 不取最大值，只平滑
const BOARD = [1000, 150, 800, 700];                     // 画板位置：改这里，鹈鹕自动跟着居中
shot(LE(2) + .3, 10, {
  xin: .4, grain: .05, tagDark: true,
  draw(ctx, lt) {
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, 0, W, H);
    // 左半边：颠簸的地面（镜头高度 = 平滑后的地面最高点，不逐帧跟着台阶跳）
    const cy = camY(lt);
    ctx.save(); ctx.beginPath(); ctx.rect(60, 150, 860, 700); ctx.clip();
    ctx.fillStyle = '#d8c7a5'; ctx.beginPath(); ctx.moveTo(60, 850);
    for (let x = 60; x <= 920; x += 8) ctx.lineTo(x, 640 - (ground(lt * RIDE + x - 300) - cy));
    ctx.lineTo(920, 850); ctx.fill();
    const gy = 640 - (rideY(lt) - cy);                   // 车轮高度也平滑（直接用 ground() 会在每个台阶上跳一下，motion_check 报「每 9 帧大跳变」）
    pelican(ctx, 300, gy, .55, { ph: lt * 9 });
    ctx.restore();
    ctx.strokeStyle = '#7a6a4a'; ctx.lineWidth = 3; ctx.strokeRect(60, 150, 860, 700);
    // 右半边：画板，鹈鹕按包围盒居中（先量一次包围盒，再居中；pelican 返回的 bbox 也可以直接用）
    ctx.fillStyle = '#fbf7ee'; ctx.fillRect(...BOARD); ctx.strokeStyle = '#7a6a4a'; ctx.strokeRect(...BOARD);
    const bb = pelicanBBox(0, 0, 1);                       // 不画，只算包围盒（等于 pelican() 的返回值）
    centerIn(ctx, c => pelican(c, 0, 0, 1, { ph: lt * 9 }), BOARD, { fit: true, bbox: bb });
    txt(ctx, 'centerIn(..., BOARD, {fit:true})', BOARD[0], BOARD[1] + BOARD[3] + 56, { size: 32, font: FONT.mono, color: '#7a6a4a' });
    txt(ctx, 'smoothTrack：镜头高度', 60, 906, { size: 36, font: FONT.sans, color: '#5a4a2a' });
  }
});
