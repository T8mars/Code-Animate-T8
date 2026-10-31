// ===== 文字之城：一个完全由代码字符构成的世界（10 秒技术样片）=====
// 字符铺在世界坐标里（不是屏幕滤镜）：山的表面、海面、云层都是一行行真实的着色器源码。
const TC = {}; // 正片版：加入前面各幕的「纪念碑」，全部由字符重建
TC.FS = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T;
uniform vec3 CP; uniform vec3 CT; uniform float FOV;
uniform float HL;      // 高亮强度（定格时金色高亮目标那一行）
uniform vec3 FOC;      // 目标点（目标行所在位置）
uniform float LROW;    // 目标行号
uniform float NROWS; uniform float COLS;
uniform sampler2D HM; uniform sampler2D ATL; uniform sampler2D TXT;
uniform vec3 M0; uniform vec3 M1; uniform vec3 M2; uniform vec3 M3; uniform vec3 M4; uniform float MA;
out vec4 O;
const float CW = 0.30, CH = 0.56;
float hgt(vec2 xz){ return texture(HM, xz*.0055).r*13.; }
float hash1(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash1(i),hash1(i+vec2(1,0)),f.x),mix(hash1(i+vec2(0,1)),hash1(i+vec2(1,1)),f.x),f.y); }
float fbm2(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
// 取一个字符格：返回 (字形覆盖率, 行号, 字符码, 是否目标行)
vec4 glyph(vec2 wp, float forceCode, float cellScale){
  vec2 g = wp / (vec2(CW, CH)*cellScale);
  vec2 cell = floor(g), f = fract(g);
  float rr = -cell.y - 1.;                 // 行号朝镜头方向递增：远处是上一行，读起来从上到下
  float tile = floor(cell.x / COLS);
  float blk = floor(rr / NROWS);
  float row = mod(rr + tile*17. + blk*5., NROWS);
  float col = mod(cell.x, COLS);
  float code = forceCode >= 0. ? forceCode : floor(texelFetch(TXT, ivec2(int(col), int(row)), 0).r*255.+.5);
  vec2 a = vec2(mod(code,16.), floor(code/16.));
  vec2 uv = (a + vec2(f.x, 1.-f.y)) / vec2(16.,6.);
  vec2 gx = dFdx(g), gy = dFdy(g);
  float m = textureGrad(ATL, uv, vec2(gx.x/16., -gx.y/6.), vec2(gy.x/16., -gy.y/6.)).r;
  vec2 fc = FOC.xz / (vec2(CW,CH)*cellScale);
  float isT = (abs(cell.y - floor(fc.y)) < .5 && floor(cell.x / COLS) == floor(fc.x / COLS) && forceCode < 0.) ? 1. : 0.;
  return vec4(m, row, code, isT);
}

// ---- 纪念碑：诡盘、侧放的画、齿轮、噪声星球、演示场景的环 ----
mat2 r2(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdTor(vec3 p, vec2 t){ vec2 q=vec2(length(p.xy)-t.x,p.z); return length(q)-t.y; }
vec2 mons(vec3 p){
  float d=1e9, id=-1.;
  if(MA<.5) return vec2(d,id);
  float near=min(min(min(length(p-M0),length(p-M1)),min(length(p-M2),length(p-M3)-6.)),length(p-M4-vec3(0,0,22.))-18.);
  if(near>20.) return vec2(near-12.,-1.);
  // 诡盘：竖着的圆盘，边上一圈缝，绕自己的轴转
  vec3 q=p-M0; q.xy*=r2(T*.6); float a=atan(q.y,q.x); float slit=step(.82,fract(a/6.2832*12.))*step(4.6,length(q.xy));
  float dd=max(length(q.xy)-6.,abs(q.z)-.35)+slit*.8; if(dd<d){d=dd;id=0.;}
  // 侧放的画：一块画布侧着靠在山上
  q=p-M1; q.xz*=r2(.5); q.xy*=r2(1.5708+.12); dd=sdBox(q,vec3(5.2,3.8,.25)); if(dd<d){d=dd;id=1.;}
  // 齿轮
  q=p-M2; q.xy*=r2(-T*.4); a=atan(q.y,q.x); float tooth=.6*smoothstep(.3,.5,abs(fract(a/6.2832*18.)-.5)*2.);
  dd=max(length(q.xy)-(5.+tooth),abs(q.z)-.7); dd=max(dd,-(length(q.xy)-1.6)); if(dd<d){d=dd;id=2.;}
  // 星球 + 光环
  q=p-M3; dd=length(q)-6.; if(dd<d){d=dd;id=3.;}
  vec3 qr=q; qr.yz*=r2(1.25); qr.xz*=r2(.3); dd=max(sdTor(qr,vec2(10.5,.6)),abs(qr.z)-.08); if(dd<d){d=dd;id=4.;}
  // 环：沿路一串
  q=p-M4; float k=clamp(floor(q.z/9.+.5),0.,5.); q.z-=k*9.; q.xy*=r2(k*.4+T*.3); dd=sdTor(q,vec2(5.5,.45)); if(dd<d){d=dd;id=5.;}
  return vec2(d,id);
}
vec3 monCol(float id, vec3 lp){
  if(id<.5) return vec3(1.,.72,.38);
  if(id<1.5){ float u=lp.x; return u<-.3?vec3(.35,.55,1.):u<.4?vec3(1.,.35,.25):vec3(1.,.82,.25); }
  if(id<2.5) return vec3(1.,.4,.25);
  if(id<3.5) return vec3(.35,.85,1.);
  if(id<4.5) return vec3(1.,.8,.5);
  return vec3(1.,.4,.9);
}
vec3 sky(vec3 rd, vec3 sun){
  float h=rd.y, s=max(dot(normalize(vec3(rd.x,0.,rd.z)),normalize(vec3(sun.x,0.,sun.z))),0.);
  vec3 c=mix(vec3(1.0,.42,.20)*(.18+.55*pow(s,4.)), vec3(.025,.06,.17), clamp(h*6.,0.,1.));
  c=mix(c, vec3(.004,.006,.025), clamp(h*2.4-.06,0.,1.));
  vec2 sg=floor(vec2(atan(rd.z,rd.x)*260., h*260.));
  float st=step(.9965,hash1(sg))*smoothstep(.05,.3,h);
  c+=vec3(.9,.92,1.)*st*(.5+.5*hash1(sg+3.));
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 fw=normalize(CT-CP), rt=normalize(cross(vec3(0,1,0),fw)), up=cross(fw,rt);
  vec3 rd=normalize(fw*FOV+uv.x*rt+uv.y*up), ro=CP;
  vec3 sun=normalize(vec3(-.35,.035,1.));
  vec3 col=sky(rd,sun);
  float SEA=2.6;
  // 地形
  float t=.3; bool hit=false; vec3 p;
  float mid=-1.;
  for(int i=0;i<160;i++){ p=ro+rd*t; float d=p.y-max(hgt(p.xz),SEA-.01); vec2 mm=mons(p); if(mm.x<d*.45){ if(mm.x<.003*t){hit=true;mid=mm.y;break;} t+=mm.x; continue; } if(d<.002*t){hit=true;break;} t+=max(.03,d*.45); if(t>380.)break; }
  float tSea = rd.y<0. ? (SEA-ro.y)/rd.y : 1e9;
  if(hit && mid>-.5){
    vec2 e=vec2(.01,0); vec3 n=normalize(vec3(mons(p+e.xyy).x-mons(p-e.xyy).x,mons(p+e.yxy).x-mons(p-e.yxy).x,mons(p+e.yyx).x-mons(p-e.yyx).x));
    vec3 C = mid<.5?M0:mid<1.5?M1:mid<2.5?M2:mid<4.5?M3:M4; vec3 lp=p-C;
    // 投影方向按法线朝向翻转，字不会镜像
    vec2 wp = abs(n.y)>.6 ? vec2(lp.x*sign(n.y), lp.z) : (abs(n.x)>abs(n.z) ? vec2(-lp.z*sign(n.x),-lp.y) : vec2(lp.x*sign(n.z),-lp.y));
    vec4 g = glyph(wp*1.6+vec2(mid*13.,mid*7.), -1., .55);
    float dif=max(dot(n,sun),0.)*.5+.5;
    vec3 mc=monCol(mid, lp/6.);
    float wave=.5+.5*sin(dot(p.xz,vec2(.045,.03))-T*2.2);
    float fres=pow(1.-max(dot(n,-rd),0.),2.5);
    col = mc*.07 + mc*g.x*(1.5+1.2*pow(wave,6.))*dif + mc*fres*.55;
    float fogA=1.-exp(-t*.0068); col=mix(col,vec3(.02,.03,.08),fogA*.8);
  } else if(hit && p.y > SEA+.005){
    float e=.06; float h0=hgt(p.xz);
    vec3 n=normalize(vec3(h0-hgt(p.xz+vec2(e,0)),e,h0-hgt(p.xz+vec2(0,e))));
    float dif=max(dot(n,sun),0.);
    float sh=1.; float st=.4; for(int k=0;k<18;k++){ vec3 q=p+sun*st; float dd=q.y-hgt(q.xz); sh=min(sh,8.*dd/st); st+=max(.5,dd*.6); if(sh<0.||st>50.)break; } sh=clamp(sh,0.,1.);
    float lit = dif*sh;
    // 三平面：陡坡用竖直投影，字才不会被拉长
    vec2 wp = abs(n.y)>.62 ? p.xz : (abs(n.x)>abs(n.z) ? vec2(p.z, -p.y*1.2) : vec2(p.x, -p.y*1.2));
    vec4 g = glyph(wp, -1., 1.);
    float hn=h0/13.;
    // 入夜：山是深蓝的，字像城市灯光一样发光；一道道光波沿代码流过
    vec3 alb = vec3(.010,.014,.035) + vec3(.50,.24,.10)*lit*.5 + vec3(.018,.03,.075)*(.5+.5*n.y);
    float hn2 = clamp(hn*1.25,0.,1.);
    vec3 gc = hn2<.5 ? mix(vec3(.12,.60,1.0), vec3(1.0,.58,.22), hn2*2.) : mix(vec3(1.0,.58,.22), vec3(1.,.90,.75), (hn2-.5)*2.);
    float wave = .5+.5*sin(dot(p.xz, vec2(.045,.03)) - T*2.2);
    float pulse = .75 + .9*pow(wave, 6.);
    float fz = smoothstep(35.,140.,t);
    float m = mix(g.x, .16, fz);
    float dimOthers = 1. - .6*HL*(1.-g.w);
    col = alb + gc*m*pulse*(.85+.5*lit)*dimOthers;
    if(g.w>.5){ col = mix(col, col*.45 + vec3(1.,.70,.25)*1.35*g.x, HL); }
    float fogA=1.-exp(-t*.0068);
    vec3 fogc=mix(vec3(.035,.05,.12),vec3(.5,.24,.14),pow(max(dot(rd,sun),0.),4.));
    col=mix(col,fogc,fogA);
  } else if(tSea<1e8 && (!hit || tSea<=t+.5)){
    vec3 q=ro+rd*tSea;
    // 分号之海：波浪推着字符格起伏
    vec2 wp=q.xz+vec2(sin(q.z*.35+T*1.4),cos(q.x*.3+T*1.1))*.18;
    vec4 g=glyph(wp, 27., 1.6);              // 27 = ';'
    vec3 n=normalize(vec3(sin(q.x*.8+T*1.3)*.06, 1., cos(q.z*.7+T)*.06));
    vec3 rf=reflect(rd,n);
    float fr=.15+.85*pow(1.-max(dot(n,-rd),0.),4.);
    float fz=smoothstep(25.,110.,tSea);
    float m=mix(g.x,.10,fz);
    float wv=.5+.5*sin(dot(q.xz,vec2(.045,.03))-T*2.2);
    col = sky(rf,sun)*fr*.8 + vec3(.25,.75,1.)*m*(.9+1.2*pow(wv,6.)) + vec3(.004,.01,.03);
    float fogA=1.-exp(-tSea*.0075);
    vec3 fogc=mix(vec3(.06,.08,.18),vec3(.55,.28,.18),pow(max(dot(rd,sun),0.),4.));
    col=mix(col,fogc,fogA);
  } else {
    // 括号之云：天上一层由 { } ( ) 组成的云
    float CY=34.;
    if(rd.y>0.){
      float tc=(CY-ro.y)/rd.y; vec3 q=ro+rd*tc;
      float dens=smoothstep(.58,.80,fbm2(q.xz*.008+vec2(T*.01,0.)));
      vec2 cc=floor(q.xz/(vec2(CW,CH)*4.));
      float h=hash1(cc);
      vec4 g=glyph(q.xz, h<.25?91.:h<.5?93.:h<.75?8.:9., 4.);   // { } ( ) 在码表里的位置
      float fz=smoothstep(60.,260.,tc);
      float m=mix(g.x,.18,fz);
      vec3 cl=mix(vec3(.45,.55,.95),vec3(1.,.6,.4),pow(max(dot(rd,sun),0.),3.));
      col=mix(col, cl*(.15+1.0*m), dens*(.1+.6*m)*(1.-fz*.7));
    }
  }
  // ACES + 轻微颗粒
  col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);
  col=pow(col,vec3(.92));
  O=vec4(col,1.);
}`;

TC.init = function (gl1080src) {
  const W = 1920, H = 1080;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  TC.cv = cv; TC.gl = gl;
  // —— 字形图集：ASCII 32..127，16×6 格，每格 64px，等宽字体
  const A = 64, ac = document.createElement('canvas'); ac.width = 16 * A; ac.height = 6 * A;
  const ax = ac.getContext('2d'); ax.fillStyle = '#000'; ax.fillRect(0, 0, ac.width, ac.height);
  ax.fillStyle = '#fff'; ax.textAlign = 'center'; ax.textBaseline = 'middle'; ax.font = `600 ${A * 0.86}px "JetBrains Mono", monospace`;
  for (let c = 32; c < 128; c++) { const k = c - 32; ax.fillText(String.fromCharCode(c), (k % 16 + .5) * A, (Math.floor(k / 16) + .55) * A); }
  const aim = ax.getImageData(0, 0, ac.width, ac.height).data, ad = new Uint8Array(16 * A * 6 * A);
  for (let i = 0; i < ad.length; i++) ad[i] = aim[i * 4];
  const atl = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atl);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 16 * A, 6 * A, 0, gl.RED, gl.UNSIGNED_BYTE, ad);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // —— 文本：就是这段着色器自己的源码（每个字符都是画出这个世界的那句代码）
  const lines = TC.FS.split('\n').map(l => l.replace(/\t/g, '  '));
  const COLS = 96, NR = lines.length; TC.lines = lines; TC.COLS = COLS; TC.NR = NR;
  const td = new Uint8Array(COLS * NR);
  lines.forEach((l, r) => { for (let c = 0; c < COLS; c++) { const ch = c < l.length ? l.charCodeAt(c) : 32; td[r * COLS + c] = Math.min(95, Math.max(0, ch - 32)); } });
  const txt = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, txt);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, COLS, NR, 0, gl.RED, gl.UNSIGNED_BYTE, td);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // —— 高度图（同正片的周期噪声高度图）
  const N = 1024, hm = new Float32Array(N * N); let mn = 1e9, mx = -1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0, a = 0.5, fq = 4, ridge = 0;
    for (let o = 0; o < 7; o++) { const n = pnoise2(x / N * fq, y / N * fq, fq); s += a * n; if (o < 5) ridge += a * Math.pow(1 - Math.abs(n * 1.4), 2); fq *= 2; a *= 0.5; }
    const v = s * 0.55 + ridge * 0.6; hm[y * N + x] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  for (let i = 0; i < hm.length; i++) hm[i] = Math.pow((hm[i] - mn) / (mx - mn), 1.7);
  TC.hm = hm; TC.N = N;
  const ht = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ht);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, N, N, 0, gl.RED, gl.FLOAT, hm);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  // —— 程序
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, `#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0,1);}`)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, TC.FS)); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr); TC.pr = pr;
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n); TC.U = U;
  gl.uniform1i(U('HM'), 0); gl.uniform1i(U('ATL'), 1); gl.uniform1i(U('TXT'), 2);
  gl.uniform2f(U('R'), W, H); gl.uniform1f(U('NROWS'), NR); gl.uniform1f(U('COLS'), COLS);
  // —— 目标：画出山的那一行（float hgt(...)）
  TC.LROW = lines.findIndex(l => l.startsWith('float hgt('));
  const CW = 0.30, CH = 0.56;
  // 在山上找一块平缓的地方，把「float hgt(...)」这一行铺在上面
  const L = lines[TC.LROW].length; let best = null, bestScore = 1e9;
  // 在山上找一块平缓的地方：遍历「块」和横向的「拼贴」，哪里的那一行正好是 float hgt(...)
  for (let blk = 2; blk < 90; blk++) for (let tile = -12; tile <= 12; tile++) {
    const rr = blk * NR + (((TC.LROW - blk * 5 - tile * 17) % NR) + NR) % NR, cy = -rr - 1, z = (cy + 0.5) * CH, x0 = tile * COLS * CW;
    const hs = []; for (let k = 0; k <= 8; k++) hs.push(TC.H(x0 + k / 8 * L * CW, z));
    const mnh = Math.min(...hs), mxh = Math.max(...hs), slope = Math.abs(TC.H(x0 + L * CW / 2, z + 2) - TC.H(x0 + L * CW / 2, z - 2)) / 4;
    if (mnh > 3.2 && mxh - mnh < 1.6 && slope < 0.3) { const sc = (mxh - mnh) + slope * 4 + Math.abs(blk - 12) * .02; if (sc < bestScore) { bestScore = sc; best = [x0 + L * CW / 2, TC.H(x0 + L * CW / 2, z), z]; } }
  }
  TC.FOC = best || [10, 6, 300];
  return 'ok';
};
TC.H = function (x, z) { // JS 侧复现 hgt()：双线性采样高度图
  const N = TC.N, u = (x * .0055 % 1 + 1) % 1 * N - .5, v = (z * .0055 % 1 + 1) % 1 * N - .5;
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (a, b) => TC.hm[((b % N + N) % N) * N + ((a % N + N) % N)];
  return 13 * lerp(lerp(g(i, j), g(i + 1, j), fu), lerp(g(i, j + 1), g(i + 1, j + 1), fu), fv);
};
// ---- 正片镜头路线：飞过纪念碑 → 定格放大目标行 → 拉远 ----
TC.plan = function () {
  const F = TC.FOC, z0 = F[2] - 560, X = F[0];
  const hmax = (x, z, r = 9) => { let m = 2.6; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m = Math.max(m, TC.H(x + i * r / 2, z + j * r / 2)); return m; };
  TC.M = [[X + 11, hmax(X + 11, z0 + 150) + 8, z0 + 150], [X - 12, hmax(X - 12, z0 + 240) + 4.5, z0 + 240], [X + 11, hmax(X + 11, z0 + 320) + 7, z0 + 320], [X - 7, hmax(X - 7, z0 + 410, 14) + 15, z0 + 410], [X, 0, z0 + 470]];
  let ry = 0; for (let k = 0; k <= 6; k++) ry = Math.max(ry, hmax(X, z0 + 470 + k * 9, 12)); TC.M[4][1] = ry + 7;
  const M = TC.M, ah = z => hmax(X, z, 6) + 4.5;
  // [时间, 机位, 看向]
  TC.K = [
    [0, [X - 45, 80, z0 - 70], [X, 8, z0 + 90]],
    [6, [X - 12, ah(z0 + 40) + 8, z0 + 40], [X + 4, ah(z0 + 120), z0 + 140]],
    [16, [X - 6, ah(z0 + 128) + 1, z0 + 128], M[0]],
    [24, [X - 1, ah(z0 + 218) + 1, z0 + 218], M[1]],
    [32, [X - 3, ah(z0 + 302) + 1, z0 + 302], M[2]],
    [40.5, [X + 4, ah(z0 + 384) + 3, z0 + 384], [M[3][0], M[3][1] + 2, M[3][2]]],
    [48.5, [X, M[4][1], z0 + 452], [X, M[4][1], z0 + 500]],
    [55.5, [X, M[4][1], z0 + 530], [X + 4, F[1] + 3, F[2] + 40]],
    [62, [F[0], F[1] + 15, F[2] - 9], [F[0], F[1], F[2]]],
    [70, [F[0], F[1] + 14, F[2] - 4.5], [F[0], F[1], F[2]]],
    [82, [F[0], F[1] + 230, F[2] - 260], [F[0], F[1], F[2] + 60]],
  ];
};
function crv(P, i, u) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(P.length - 1, i + 1)], p3 = P[Math.min(P.length - 1, i + 2)];
  return [0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u)); }
TC.rawCam = null;
TC.clr = function (t) {
  if (!TC.CLR) { // 0.1 秒一个采样：机位附近一大片地形的最高点 + 余量，再做滑动最大值和多次平滑
    const raw = [], N = 821; TC.CLR = [];
    for (let k = 0; k < N; k++) { const c = TC.cam(k / 10, true).cp; let g = 2.6; for (let i = -3; i <= 3; i++) for (let j = -2; j <= 8; j++) g = Math.max(g, TC.H(c[0] + i * 3, c[2] + j * 3)); raw.push(g + 4.0); }
    let m = raw.map((_, k) => { let x = 0; for (let q = Math.max(0, k - 15); q <= Math.min(N - 1, k + 15); q++) x = Math.max(x, raw[q]); return x; });
    for (let pass = 0; pass < 4; pass++) m = m.map((_, k) => { let s = 0, n = 0; for (let q = Math.max(0, k - 10); q <= Math.min(N - 1, k + 10); q++) { s += m[q]; n++; } return s / n; });
    TC.CLR = m;
  }
  const f = clamp(t * 10, 0, TC.CLR.length - 1), i = Math.floor(f), u = f - i; return lerp(TC.CLR[i], TC.CLR[Math.min(i + 1, TC.CLR.length - 1)], u);
};
TC.cam = function (t, raw) {
  const K = TC.K; let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const u0 = clamp((t - K[i][0]) / (K[i + 1][0] - K[i][0])); const u = (i >= 7) ? ease.inout(u0) : u0;
  let cp, ct;
  if (i >= 7) { const l3 = (A, B) => A.map((v, j) => lerp(v, B[j], u)); cp = l3(K[i][1], K[i + 1][1]); ct = l3(K[i][2], K[i + 1][2]); }  // 定格段用缓动直线，避免样条过冲把镜头甩到背面
  else { cp = crv(K.map(k => k[1]), i, u); ct = crv(K.map(k => k[2]), i, u); }
  // 离地高度：预先算好一条平滑的「最低安全高度」曲线，用软最大值，镜头不会跟着地面小起伏上下抖
  if (!raw) { const w = 1 - Math.max(sstep(44.5, 47.5, t) * (1 - sstep(55.5, 58.5, t)), sstep(59.5, 62, t) * (1 - sstep(71, 74, t))); if (w > 0) { const c = TC.clr(t); const k = 2.0; const y2 = (cp[1] + c + Math.sqrt((cp[1] - c) ** 2 + k * k)) / 2; cp[1] = lerp(cp[1], y2, w); } }
  const fov = t > 62 && t < 72 ? lerp(1.55, 1.35, ease.inout((t - 62) / 6)) : 1.55;
  return { cp, ct, fov };
};
TC.render = function (t) {
  const gl = TC.gl, U = TC.U, c = TC.cam(t);
  gl.useProgram(TC.pr);
  gl.uniform1f(U('T'), t); gl.uniform3f(U('CP'), ...c.cp); gl.uniform3f(U('CT'), ...c.ct); gl.uniform1f(U('FOV'), c.fov);
  gl.uniform1f(U('HL'), sstep(62.2, 63.0, t) * (1 - sstep(71, 73, t))); gl.uniform3f(U('FOC'), ...TC.FOC); gl.uniform1f(U('LROW'), TC.LROW);
  ['M0', 'M1', 'M2', 'M3', 'M4'].forEach((k, i) => gl.uniform3f(U(k), ...TC.M[i])); gl.uniform1f(U('MA'), 1);
  gl.viewport(0, 0, 1920, 1080); gl.drawArrays(gl.TRIANGLES, 0, 3); return TC.cv;
};
