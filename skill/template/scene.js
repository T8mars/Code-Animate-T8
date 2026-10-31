// scene.js —— 你的片子写在这里。约定：renderFrame(t) 必须是确定性的（同一个 t 永远画出同一帧）。
// 示例：10 秒的演示场景片头（隧道 + 正弦滚动字幕 + 彩虹光栅条），可以直接渲染看效果。
const MAIN = document.getElementById('c'), CTX = MAIN.getContext('2d');
let G;
const TUNNEL = `
void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float a=atan(uv.y,uv.x), r=length(uv);
  float z=.3/r+T*2.4, an=a/3.14159*6.+T*.5; float ch=mod(floor(z*2.)+floor(an),2.);
  vec3 c=mix(vec3(.95,.15,.55),vec3(.1,.85,1.),ch)*(.3+.7*fract(z)); c*=smoothstep(0.,.45,r)*1.3;
  O=vec4(c+vec3(1.,.9,.6)*smoothstep(.07,0.,r),1.); }`;
async function initFilm() { await document.fonts.ready; for (const f of ['700 96px "JetBrains Mono"', '400 40px "JetBrains Mono"']) await document.fonts.load(f); G = makeGL(1280, 720); G.add('tunnel', TUNNEL); return 'ok'; }
function renderFrame(t) {
  const ctx = CTX; const f = Math.round(t * FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(G.run('tunnel', { T: t }), 0, 0, W, H);
  for (let k = 0; k < 6; k++) { const y = H / 2 + Math.sin(t * 1.8 + k * .45) * 360, hue = (k * 50 + t * 40) % 360; const g = ctx.createLinearGradient(0, y - 26, 0, y + 26); g.addColorStop(0, `hsla(${hue},90%,30%,0)`); g.addColorStop(.5, `hsla(${hue},95%,65%,.7)`); g.addColorStop(1, `hsla(${hue},90%,30%,0)`); ctx.fillStyle = g; ctx.fillRect(0, y - 26, W, 52); }
  const msg = '   HELLO FROM CODE ... EVERY FRAME IS WRITTEN ...   ';
  ctx.font = `700 96px ${FONT.mono}`; for (let i = 0; i < msg.length; i++) { const x = W + 40 - t * 520 + i * 62; if (x < -80 || x > W + 80) continue; ctx.fillStyle = `hsl(${(x * .2 + t * 120) % 360},95%,65%)`; ctx.fillText(msg[i], x, 860 + Math.sin(x * .006 + t * 3) * 60); }
  post(ctx, f); return f;
}
window.initFilm = initFilm; window.renderFrame = renderFrame;
