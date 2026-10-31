// scene.js —— 3 秒最小示例：转盘动画的两种正确做法（lib.js 的 stepAt / motionBlur）
// 左：诡盘（phénakistiscope）。12 格小鸟拍翅，透过缝看。用 stepAt(lt, FPS, 30) 每帧正好转一格 → 小鸟原地拍翅、节奏均匀。
// 右：快速旋转的辐条轮（每秒 2.3 圈）。不加模糊时每帧转过 28°，辐条会频闪/看着倒转；用 motionBlur 拆 12 个子帧平均。
// 地址后加 ?bad=1 看「做坏」的版本：左边每秒跳 8 下（30fps 下 4/4/4/3 帧交替，一卡一卡），右边不加模糊。
//   渲染坏版本：PAGE='film.html?bad=1' node render.js 0 3 bad.mp4 （render.js 直接拼接 PAGE，查询参数能传进去）
// 用法：复制成 template/scene.js，或者另建一个 html 引用它；然后 node render.js 0 3 demo.mp4 && python3 motion_check.py demo.mp4
const MAIN = document.getElementById('c'), CTX = MAIN.getContext('2d');
const BAD = new URLSearchParams(location.search).get('bad') === '1';
let DISC = null;

// 小鸟剪影：全部用填充（不要用细描边再整体缩放 —— 成片里 lineWidth .1 + scale 的翅膀在 1080p 下像断线）
function bird(c, x, y, s, ph, col) {
  const fl = Math.sin(ph * Math.PI * 2);
  c.save(); c.translate(x, y + fl * s * .12); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); c.ellipse(0, 0, .55, .3, -.1, 0, 7); c.fill();                       // 身体
  c.beginPath(); c.arc(.48, -.32, .17, 0, 7); c.fill();                                // 头
  c.beginPath(); c.moveTo(.6, -.36); c.lineTo(1.25, -.2); c.quadraticCurveTo(.85, .05, .58, -.18); c.fill(); // 喙
  const tx = -.98 + Math.abs(fl) * .08, ty = -.3 - fl * 1.0;                            // 翅尖随拍翅上下
  c.beginPath(); c.moveTo(.2, -.2); c.quadraticCurveTo(-.25, -.5 - fl * .55, tx, ty); c.quadraticCurveTo(-.62, -.16 - fl * .42, -.42, -.04); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-.38, -.04); c.lineTo(-.92, .14); c.lineTo(-.5, .2); c.closePath(); c.fill();     // 尾
  c.restore();
}
function makeDisc(R) {   // 预先画好一张盘面（12 格，每格小鸟差 1/12 拍翅周期），每帧只旋转贴图
  const [cv, c] = mk2d(R * 2 + 20, R * 2 + 20); c.translate(R + 10, R + 10);
  c.fillStyle = '#e8d8b4'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.strokeStyle = '#5a3c1e'; c.lineWidth = 8; c.stroke();
  for (let k = 0; k < 12; k++) {
    c.save(); c.rotate(k * Math.PI / 6);
    c.fillStyle = '#120a04'; c.fillRect(-8, -R + 6, 16, R * .17);        // 缝
    bird(c, 0, -R * .6, R * .15, k / 12, '#7a2e1c');
    c.restore();
  }
  c.fillStyle = '#5a3c1e'; c.beginPath(); c.arc(0, 0, R * .07, 0, 7); c.fill();
  return cv;
}
function spokeWheel(c, x, y, R, ang) {   // 辐条轮：12 根粗辐条 + 一个红色标记，看得出转向
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = '#20242c'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
  c.fillStyle = '#e9e4d8'; for (let k = 0; k < 12; k++) { c.save(); c.rotate(k * Math.PI / 6); c.fillRect(-9, 0, 18, R * .92); c.restore(); }
  c.fillStyle = '#ff5a36'; c.beginPath(); c.arc(0, -R * .7, R * .12, 0, 7); c.fill();
  c.lineWidth = 16; c.strokeStyle = '#e9e4d8'; c.beginPath(); c.arc(0, 0, R * .96, 0, 7); c.stroke();
  c.restore();
}
async function initFilm() {
  await document.fonts.ready; for (const f of ['400 40px "JetBrains Mono"']) await document.fonts.load(f);
  DISC = makeDisc(360); return 'ok';
}
function renderFrame(t) {
  const ctx = CTX, f = Math.round(t * FPS); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#100a05'; ctx.fillRect(0, 0, W, H);
  // ---- 左：诡盘 ----
  const slot = BAD ? Math.floor(t * 8) : stepAt(t, FPS, 30);    // 坏：每秒 8 格（不整除 30）；好：每帧一格
  ctx.save(); ctx.translate(500, 560); ctx.rotate((slot + .5) * Math.PI / 6); ctx.drawImage(DISC, -370, -370); ctx.restore();
  // ---- 右：快速辐条轮 ----
  const spin = tt => tt * 2.3 * Math.PI * 2;                     // 每秒 2.3 圈 = 每帧 27.6°
  if (BAD) spokeWheel(ctx, 1420, 560, 330, spin(t));
  else motionBlur((c, tt) => { c.fillStyle = '#100a05'; c.fillRect(1060, 200, 720, 720); spokeWheel(c, 1420, 560, 330, spin(tt)); }, t, 12, 0.5, { ctx });
  // 说明文字（≥36px，垫暗底）
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(60, 40, 1800, 80);
  txt(ctx, BAD ? 'Math.floor(t*8)  —— 4/4/4/3 帧' : 'stepAt(t, 30, 30)  —— 每帧一格', 100, 96, { size: 40, font: FONT.mono, color: BAD ? '#ff8a6a' : '#9fe0a0' });
  txt(ctx, BAD ? '无模糊' : 'motionBlur(n=12)', 1180, 96, { size: 40, font: FONT.mono, color: BAD ? '#ff8a6a' : '#9fe0a0' });
  post(ctx, f); return f;
}
window.initFilm = initFilm; window.renderFrame = renderFrame;
