// scene.js —— 10 秒演示场景片头「NEON//2026」
// 0–3.2s  等离子 + 星空 + 铜条(raster bars) + "A CODE-FILM PRODUCTION"
// 3.2–7.6s 扭曲隧道 + 线框立方体 + 正弦滚动字
// 7.6–8.4s 加速蓄力（隧道提速、立方体冲向镜头）
// 8.4s     冲击：白闪 + 标题砸下 + 屏幕震动，之后持续发光到 10s（不黑屏）
const MAIN = document.getElementById('c'), CTX = MAIN.getContext('2d');
let G;
const FX = `
uniform float MIX; uniform float FLASH;
vec3 pal(float x){ return .5+.5*cos(6.2831*(x+vec3(0.,.33,.67))); }
vec3 plasma(vec2 uv,float t){
  float v=sin(uv.x*6.+t*1.3)+sin(uv.y*5.-t*1.1)+sin((uv.x+uv.y)*4.+t*.7)+sin(length(uv*8.+vec2(sin(t*.5),cos(t*.4))*3.)-t*2.);
  vec3 c=pal(v*.18+t*.05)*.85; c*=.55+.45*sin(v*3.14159); return c*vec3(.7,.55,1.);
}
vec3 tunnel(vec2 uv,float t,float z0){
  uv+=vec2(sin(t*.9),cos(t*.7))*.12;
  float r=length(uv), a=atan(uv.y,uv.x);
  float z=.35/max(r,.001)+z0; a+=.6*sin(z*.6+t)+t*.4;
  float u=a/6.2831*8., ch=mod(floor(z*1.5)+floor(u),2.);
  float zz=z*1.5, ez=abs(fract(zz)-.5), eu=abs(fract(u)-.5);
  float lz=smoothstep(.5-2.5*fwidth(zz),.5-.8*fwidth(zz),ez);
  float fu=min(fwidth(u),fwidth(fract(u+.5))); float lu=smoothstep(.5-2.5*fu,.5-.8*fu,eu);
  vec3 base=mix(vec3(.04,.01,.12),vec3(.16,.0,.38),ch);
  vec3 line=pal(z*.3+t*.25)*max(lz,lu)*1.8;
  vec3 c=(base+line)*smoothstep(.0,.5,r)*(.4+.6*smoothstep(12.,2.,z-z0));
  return c+vec3(1.,.5,.9)*smoothstep(.12,.0,r)*.8;
}
void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 c=mix(plasma(uv,T),tunnel(uv,T,P),MIX);
  c=aces(c*1.2); c=mix(c,vec3(1.),FLASH);
  O=vec4(c,1.); }`;
const STARS = (() => { const r = mulberry(2026), a = []; for (let i = 0; i < 260; i++) a.push([r() * 2 - 1, r() * 2 - 1, r()]); return a; })();
const CUBE_V = []; for (let i = 0; i < 8; i++) CUBE_V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const CUBE_E = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = i ^ j; if (d === 1 || d === 2 || d === 4) CUBE_E.push([i, j]); }
async function initFilm() {
  await Promise.all(['600 100px "Space Grotesk"', '400 60px "JetBrains Mono"', '500 60px "Cormorant Garamond"'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  G = makeGL(1280, 720); G.add('fx', FX); return 'ok';
}
const HIT = 8.4;
// 隧道前进距离：解析式（不逐帧累加），保证确定性
function tunnelZ(t) { const tt = Math.max(0, t - 2.4); const boost = Math.max(0, t - 7.6); return tt * 2.2 + boost * boost * 3.5; }
function starfield(ctx, t, alpha) {
  if (alpha <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, z0] of STARS) { const z = ((z0 - t * 0.35) % 1 + 1) % 1 + 0.02; const sx = W / 2 + x / z * 420, sy = H / 2 + y / z * 420; if (sx < 0 || sx > W || sy < 0 || sy > H) continue; const s = (1 - z) * 5 + 1; ctx.globalAlpha = alpha * (1 - z); ctx.fillStyle = '#EAF6FF'; ctx.fillRect(sx - s / 2, sy - s / 2, s, s); }
  ctx.restore();
}
function rasterBars(ctx, t, alpha) {
  if (alpha <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  for (let k = 0; k < 7; k++) { const y = H * 0.5 + Math.sin(t * 2.1 + k * 0.38) * 300 + Math.sin(t * 0.9 + k) * 40; const hue = (k * 40 + 190) % 360; const g = ctx.createLinearGradient(0, y - 22, 0, y + 22); g.addColorStop(0, `hsla(${hue},90%,20%,0)`); g.addColorStop(.5, `hsla(${hue},100%,70%,.85)`); g.addColorStop(1, `hsla(${hue},90%,20%,0)`); ctx.fillStyle = g; ctx.fillRect(0, y - 22, W, 44); }
  ctx.restore();
}
function cube(ctx, t, alpha, scale) {
  if (alpha <= 0) return; const ax = t * 1.1, ay = t * 0.8, az = t * 0.45;
  const P = CUBE_V.map(([x, y, z]) => { let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c]; c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(az); s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c]; const d = 4 / (z + 5); return [W / 2 + x * d * scale, H * 0.44 + y * d * scale]; });
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = 5; ctx.strokeStyle = '#7CF7FF'; ctx.shadowColor = '#7CF7FF'; ctx.shadowBlur = 24; ctx.lineCap = 'round';
  ctx.beginPath(); for (const [i, j] of CUBE_E) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); } ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; for (const p of P) { ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 7); ctx.fill(); }
  ctx.restore();
}
function scroller(ctx, t, alpha) {
  if (alpha <= 0) return; const msg = '   GREETINGS TO ALL PIXEL WRITERS ... NO CAMERA, JUST CODE ...   ';
  const lt = t - 3.0; ctx.save(); ctx.font = `400 84px ${FONT.mono}`; ctx.textBaseline = 'middle';
  const g = ctx.createLinearGradient(0, 790, 0, 1010); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(4,0,14,${0.55 * alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 790, W, 220);
  for (let i = 0; i < msg.length; i++) { const x = W + 40 - lt * 640 + i * 54; if (x < -60 || x > W + 60) continue; const y = 900 + Math.sin(x * 0.007 + t * 4) * 55; ctx.globalAlpha = alpha; ctx.fillStyle = `hsl(${(x * 0.15 + t * 90) % 360},100%,68%)`; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 10; ctx.fillText(msg[i], x, y); }
  ctx.restore();
}
function intro(ctx, t) {
  const a = sstep(0.4, 1.0, t) * (1 - sstep(2.6, 3.1, t)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; const s = 'A  CODE-FILM  PRODUCTION'; ctx.font = `600 44px ${FONT.grot}`; ctx.letterSpacing = '6px'; const w = ctx.measureText(s).width;
  ctx.fillStyle = 'rgba(4,0,14,0.5)'; ctx.fillRect(W / 2 - w / 2 - 40, H / 2 - 50, w + 80, 100);
  const n = Math.floor(clamp((t - 0.5) / 1.2) * s.length); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(s.slice(0, n) + (Math.floor(t * 4) % 2 && n < s.length ? '_' : ''), W / 2 - w / 2, H / 2 + 2);
  ctx.restore();
}
function title(ctx, t, f) {
  const lt = t - HIT; if (lt < 0) return; const r = mulberry(f * 7919 + 13);
  const drop = ease.expo(lt / 0.25), sc = lerp(2.6, 1, drop) * (1 + 0.012 * Math.sin(t * 6));
  const shake = Math.max(0, 1 - lt / 0.6) * 26; const ox = (r() - .5) * shake, oy = (r() - .5) * shake;
  const ab = 4 + Math.max(0, 1 - lt / 0.5) * 30;
  const s = 'NEON//2026';
  ctx.save(); ctx.translate(W / 2 + ox, H * 0.47 + oy); ctx.scale(sc, sc);
  ctx.font = `600 210px ${FONT.grot}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '8px';
  const tw = ctx.measureText(s).width; ctx.fillStyle = `rgba(4,0,14,${0.5 * drop})`; ctx.fillRect(-tw / 2 - 60, -130, tw + 120, 260);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#FF2A6D'; ctx.fillText(s, -ab, 0); ctx.fillStyle = '#05D9E8'; ctx.fillText(s, ab, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.shadowColor = '#FF8AD8'; ctx.shadowBlur = 40; ctx.fillStyle = '#FFF6FB'; ctx.fillText(s, 0, 0);
  ctx.restore();
  const gl = Math.max(0, 1 - lt / 0.7);
  if (gl > 0) { for (let k = 0; k < 9; k++) { const y = 300 + r() * 480, h = 8 + r() * 40, dx = (r() - .5) * 160 * gl; ctx.drawImage(MAIN, 0, y, W, h, dx, y, W, h); } }
  const sa = sstep(0.5, 1.0, lt);
  if (sa > 0) { ctx.save(); ctx.globalAlpha = sa; ctx.font = `400 40px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.letterSpacing = '14px'; ctx.fillStyle = 'rgba(4,0,14,.55)'; ctx.fillRect(W / 2 - 480, H * 0.47 + 168, 960, 64); ctx.fillStyle = '#7CF7FF'; ctx.fillText('EVERY FRAME IS WRITTEN', W / 2, H * 0.47 + 213); ctx.restore(); }
  if (lt < 0.8) { const rr = ease.out(lt / 0.8) * 1300; ctx.save(); ctx.globalAlpha = 1 - lt / 0.8; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 18 * (1 - lt / 0.8) + 2; ctx.beginPath(); ctx.arc(W / 2, H * 0.47, rr, 0, 7); ctx.stroke(); ctx.restore(); }
}
function renderFrame(t) {
  const ctx = CTX; const f = Math.round(t * FPS); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const mix = sstep(2.6, 3.4, t);
  const flash = t >= HIT ? Math.max(0, 1 - (t - HIT) / 0.35) : sstep(HIT - 0.25, HIT, t) * 0.6;
  ctx.drawImage(G.run('fx', { T: t, P: tunnelZ(t), U: { MIX: mix, FLASH: flash } }), 0, 0, W, H);
  starfield(ctx, t, 1 - sstep(2.8, 3.4, t));
  rasterBars(ctx, t, (1 - sstep(2.7, 3.3, t)) * 0.8);
  intro(ctx, t);
  const build = sstep(7.6, HIT, t);
  cube(ctx, t, sstep(3.3, 4.0, t) * (1 - sstep(8.0, HIT, t)), 150 + build * 500);
  scroller(ctx, t, sstep(3.0, 3.4, t) * (1 - sstep(7.6, 8.1, t)));
  title(ctx, t, f);
  if (t > HIT + 0.3) rasterBars(ctx, t * 1.3, sstep(HIT + 0.3, HIT + 1.0, t) * 0.35);
  post(ctx, f); return f;
}
window.initFilm = initFilm; window.renderFrame = renderFrame;
