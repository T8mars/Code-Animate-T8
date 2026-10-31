// ===== 基础设施：画布、缓动、噪声、WebGL =====
const W = 1920, H = 1080, FPS = 30;
const C = {
  ink: '#070A12', ink2: '#0C1220', gold: '#F2C46D', cream: '#EDE6D6', cyan: '#6FD3FF', mag: '#FF5FA2', dim: 'rgba(237,230,214,0.55)'
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = {
  out: t => 1 - Math.pow(1 - clamp(t), 3),
  inout: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  in: t => Math.pow(clamp(t), 3),
  expo: t => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
};
// 确定性随机
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---- Ken Perlin 改进版噪声（2002 参考实现的 JS 版）----
const PERM = (() => { const r = mulberry(1982), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1));[p[i], p[j]] = [p[j], p[i]]; } const out = new Uint8Array(512); for (let i = 0; i < 512; i++) out[i] = p[i & 255]; return out; })();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(x, y, z) {
  let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
  const u = fade(x), v = fade(y), w = fade(z), P = PERM;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}
// 周期性 2D 梯度噪声（地形高度图用，可无缝平铺）
function pnoise2(x, y, per) {
  const X0 = Math.floor(x), Y0 = Math.floor(y), fx = x - X0, fy = y - Y0;
  const g = (ix, iy) => { ix = ((ix % per) + per) % per; iy = ((iy % per) + per) % per; const h = PERM[(PERM[ix & 255] + iy) & 511] + ((ix >> 8) * 31 + (iy >> 8) * 17); const a = h * 2.399963; return [Math.cos(a), Math.sin(a)]; };
  const d = (ix, iy) => { const gg = g(ix, iy); return gg[0] * (x - ix) + gg[1] * (y - iy); };
  const u = fade(fx), v = fade(fy);
  return lerp(lerp(d(X0, Y0), d(X0 + 1, Y0), u), lerp(d(X0, Y0 + 1), d(X0 + 1, Y0 + 1), u), v);
}

// ---- WebGL ----
const GLSL_HEAD = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T; uniform float P; uniform float Q; uniform float S;
uniform sampler2D HM; uniform sampler2D TX2;
out vec4 O;
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.+2.*fract(sin(p)*43758.5453123);}
float hash1(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float gnoise(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
            mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p,float oct){float s=0.,a=.5;for(int i=0;i<8;i++){float fi=float(i); if(fi>=oct)break; float w=clamp(oct-fi,0.,1.); s+=w*a*gnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
`;
function makeGL(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  const vs = `#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const progs = {};
  function sh(t, s) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) + '\n' + s.split('\n').map((l, i) => (i + 1) + ': ' + l).slice(0, 400).join('\n')); return x; }
  return {
    cv, gl,
    add(name, body) { const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GLSL_HEAD + body)); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); progs[name] = pr; },
    run(name, u = {}) {
      const pr = progs[name]; gl.useProgram(pr); gl.viewport(0, 0, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(pr, 'R'), w, h);
      for (const k of ['T', 'P', 'Q', 'S']) gl.uniform1f(gl.getUniformLocation(pr, k), u[k] || 0);
      if (u.U) for (const k in u.U) { const v = u.U[k], l = gl.getUniformLocation(pr, k); if (l == null) continue; if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v); }
      if (u.tex2) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, u.tex2); gl.uniform1i(gl.getUniformLocation(pr, 'TX2'), 1); }
      if (u.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, u.tex); gl.uniform1i(gl.getUniformLocation(pr, 'HM'), 0); }
      gl.drawArrays(gl.TRIANGLES, 0, 3); return cv;
    },
    texRGBA16(data, n) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, n, n, 0, gl.RGBA, gl.FLOAT, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); return t; },
    texImg(cv, rep) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); const w = rep ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w); return t; },
    texR16(data, n) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, n, n, 0, gl.RED, gl.FLOAT, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); return t; }
  };
}

// ---- 2D 工具 ----
function mk2d(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const FONT = { serif: '"Noto Serif CJK SC","Noto Serif SC",serif', disp: '"Cormorant Garamond",serif', mono: '"JetBrains Mono","Noto Sans Mono CJK SC",monospace', grot: '"Space Grotesk","Noto Sans CJK SC",sans-serif', sans: '"Noto Sans CJK SC",sans-serif' };
function txt(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.font = `${o.w || 400} ${o.size || 40}px ${o.font || FONT.serif}`; ctx.fillStyle = o.color || C.cream; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha); if (o.ls) ctx.letterSpacing = o.ls + 'px';
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur || 20; }
  ctx.fillText(s, x, y); const m = ctx.measureText(s).width; ctx.restore(); return m;
}
// 逐字浮现的字幕：lines=[...], 时间 lt 相对字幕起点, dur=持续
function caption(ctx, lines, lt, dur, o = {}) {
  if (lt < 0 || lt > dur) return;
  const x = o.x == null ? 140 : o.x, y0 = o.y == null ? 900 : o.y, size = o.size || 46, lh = size * 1.55;
  const outA = 1 - sstep(dur - 0.45, dur, lt);
  ctx.save();
  if (o.scrim !== false) { const g = ctx.createLinearGradient(0, y0 - lh * lines.length - 80, 0, H); g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, `rgba(5,7,12,${0.62 * outA})`); ctx.fillStyle = g; ctx.fillRect(0, y0 - lh * lines.length - 80, W, H); }
  let k = 0;
  lines.forEach((line, li) => {
    const y = y0 - (lines.length - 1 - li) * lh; let cx = x;
    if (o.align === 'center') { ctx.font = `${o.w || 500} ${size}px ${FONT.serif}`; cx = W / 2 - ctx.measureText(line).width / 2; }
    for (const ch of line) {
      const a = sstep(k * 0.028, k * 0.028 + 0.35, lt) * outA; k++;
      ctx.font = `${o.w || 500} ${size}px ${FONT.serif}`; ctx.fillStyle = o.color || C.cream; ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18;
      ctx.fillText(ch, cx, y + (1 - a) * 10); cx += ctx.measureText(ch).width;
    }
  });
  ctx.restore();
}
// 胶片颗粒 + 暗角（全片统一后期）
const GRAIN = (() => { const arr = []; const r = mulberry(7); for (let k = 0; k < 6; k++) { const [c, x] = mk2d(480, 270); const im = x.createImageData(480, 270); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); arr.push(c); } return arr; })();
function post(ctx, f, amt = 0.055) {
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amt; ctx.imageSmoothingEnabled = false; ctx.drawImage(GRAIN[f % 6], 0, 0, W, H); ctx.restore();
  ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// "史实 / 传说" 印章
function stamp(ctx, label, sub, x, y, a, rot = -0.08) {
  if (a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); const s = 1 + (1 - ease.out(a)) * 0.6; ctx.scale(s, s); ctx.globalAlpha = clamp(a * 1.4);
  ctx.font = `900 50px ${FONT.serif}`; ctx.letterSpacing = '10px'; const bw = Math.max(184, ctx.measureText(label).width + 50); ctx.letterSpacing = '0px'; ctx.strokeStyle = '#E2533B'; ctx.lineWidth = 5; ctx.strokeRect(-bw / 2, -46, bw, 92); ctx.lineWidth = 1.5; ctx.strokeRect(-bw / 2 + 8, -38, bw - 16, 76);
  txt(ctx, label, 0, 16, { size: 50, w: 900, color: '#E2533B', align: 'center', font: FONT.serif, ls: 10 });
  if (sub) { ctx.font = `500 32px ${FONT.sans}`; const sw = ctx.measureText(sub).width + 28; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-sw / 2, 60, sw, 44); txt(ctx, sub, 0, 93, { size: 32, color: 'rgba(245,240,230,0.95)', align: 'center', font: FONT.sans }); }
  ctx.restore();
}
