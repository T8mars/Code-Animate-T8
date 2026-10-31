// ===== 第三幕着色器 =====
// 演示场景小片：P=段落(0 隧道 1 金属球 2 等离子 3 合体)，S=节拍脉冲
SH.demo = `
float sdS(vec3 p,float r){return length(p)-r;}
vec2 scene(vec3 p){ float fl=p.y+1.;
  vec3 q=p; q.xz=mod(q.xz+2.,4.)-2.;
  float s=sdS(q-vec3(0.,sin(T*2.+floor((p.x+2.)/4.)*1.7)*.4,0.),.8);
  return s<fl?vec2(s,1.):vec2(fl,2.); }
vec3 tunnel(vec2 uv,float t){ float a=atan(uv.y,uv.x), r=length(uv);
  float z=.3/r+t*2.4, an=a/3.14159*6.+t*.5; float ch=mod(floor(z*2.)+floor(an),2.);
  vec3 c=mix(vec3(.95,.15,.55),vec3(.1,.85,1.),ch)*(.3+.7*fract(z)); c*=smoothstep(0.,.45,r)*1.3; return c+vec3(1.,.9,.6)*smoothstep(.07,0.,r); }
vec3 plasma(vec2 uv,float t){ float v=sin(uv.x*6.+t)+sin(uv.y*5.-t*1.3)+sin((uv.x+uv.y)*4.+t*.7)+sin(length(uv*7.)-t*2.);
  return .5+.5*cos(vec3(0.,2.1,4.2)+v*1.6+t); }
vec3 balls(vec2 uv,float t){ vec3 ro=vec3(t*1.5,1.2+sin(t*.4)*.3,-4.+t*1.1), rd=normalize(vec3(uv,1.4)); rd.yz*=mat2(.97,.24,-.24,.97);
  float d=0.; vec2 h; for(int i=0;i<64;i++){ h=scene(ro+rd*d); if(h.x<.002||d>40.)break; d+=h.x; }
  vec3 col=mix(vec3(.9,.4,.7),vec3(.1,.05,.25),clamp(rd.y*3.+.3,0.,1.));
  if(d<40.){ vec3 p=ro+rd*d; vec2 e=vec2(.002,0); vec3 n=normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));
    if(h.y>1.5){ float ch=mod(floor(p.x)+floor(p.z),2.); col=mix(vec3(.05,.0,.12),vec3(.1,.85,1.),ch*.8); col*=exp(-d*.06); }
    else { vec3 r=reflect(rd,n); col=mix(vec3(.9,.4,.7),vec3(.1,.05,.25),clamp(r.y*3.+.3,0.,1.)); if(r.y<0.){ vec2 gp=p.xz+r.xz*(-(p.y+1.)/r.y); col=mix(vec3(.05,0.,.12),vec3(.1,.85,1.),mod(floor(gp.x)+floor(gp.y),2.)*.8)*.8; }
      col+=pow(max(dot(r,normalize(vec3(.5,.8,.3))),0.),40.)*1.5; } }
  return col; }
void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; vec3 c;
  int m=int(P+.001);
  if(m==0) c=tunnel(uv,T);
  else if(m==1) c=balls(uv,T);
  else if(m==2){ vec2 q=uv*mat2(cos(T*.3),sin(T*.3),-sin(T*.3),cos(T*.3))*(1.2+.4*sin(T*.5)); c=plasma(q,T)*(.6+.4*step(.5,fract(q.y*6.+T))); }
  else { vec3 a=tunnel(uv,T); vec3 b=balls(uv*1.3,T); c=mix(a,b,smoothstep(.25,.0,length(uv)-.15*S)); }
  c*=1.+S*.6; c*=.9+.1*sin(gl_FragCoord.y*3.14159);
  O=vec4(c,1.); }`;

// Shadertoy 式：一个球平滑合并出另一个球、环、地面；S=分屏位置(0..1)，P=合并进度，Q=调试视图比例
SH.sdf = `
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float map(vec3 p){
  float d=length(p-vec3(0,.2,0))-.8;
  float k=.45;
  d=smin(d,length(p-vec3(sin(T*.7)*1.5*P,.4+cos(T*.9)*.3,cos(T*.7)*.6))-.5*P,k);
  vec2 q=vec2(length(p.xz-vec2(0,0))-1.4,p.y-.1-sin(T)*.2); d=smin(d,length(q)-.18*clamp(P*2.-.6,0.,1.)-.001,k);
  d=smin(d,p.y+.9+ (1.-clamp(P*2.-1.,0.,1.))*3.,.6);
  return d; }
void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float a=T*.2; vec3 ro=vec3(sin(a)*4.2,1.4,-cos(a)*4.2), ta=vec3(0,0,0);
  vec3 fw=normalize(ta-ro), rt=normalize(cross(vec3(0,1,0),fw)), up=cross(fw,rt); vec3 rd=normalize(fw*1.6+uv.x*rt+uv.y*up);
  float t=0.; int steps=0; bool hit=false;
  for(int i=0;i<128;i++){ steps=i; float d=map(ro+rd*t); if(d<.001){hit=true;break;} t+=d; if(t>30.)break; }
  vec3 col=vec3(.92,.94,.97)*(.75+.25*rd.y);
  if(hit){ vec3 p=ro+rd*t; vec2 e=vec2(.001,0); vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
    vec3 L=normalize(vec3(.6,.8,-.4)); float dif=max(dot(n,L),0.);
    float sh=1.,st=.02; for(int k=0;k<32;k++){ float h=map(p+L*st); sh=min(sh,8.*h/st); st+=clamp(h,.02,.3); if(h<.001||st>6.)break; } sh=clamp(sh,0.,1.);
    float ao=0.; for(int k=1;k<5;k++){ float h=.06*float(k); ao+=(h-map(p+n*h)); } ao=clamp(1.-ao*3.,0.,1.);
    col=vec3(.95)*(dif*sh*.9+.25*ao*(.6+.4*n.y)) + vec3(1.,.9,.8)*pow(max(dot(reflect(rd,n),L),0.),30.)*.4*sh; }
  float s=float(steps)/80.; vec3 heat=clamp(vec3(s*2.,s*2.-.6,1.-s*3.)+vec3(0.,0.,.2),0.,1.);
  float split=(S*2.-1.)*R.x/R.y*.5;
  col = uv.x<split? heat : col;
  col = mix(col, vec3(1.,.8,.3), smoothstep(.004,.0,abs(uv.x-split))*step(.001,S)*step(S,.999));
  O=vec4(pow(col,vec3(.9)),1.); }`;

// 三维分形（阿波罗尼奥斯式反演）：T=深度推进，P=寻找出口的转向，Q=坏像素出现
SH.fractal = `
float map(vec3 p, out float orb){
  float s=1.; orb=1e3;
  for(int i=0;i<9;i++){ p=-1.+2.*fract(.5*p+.5); float r2=dot(p,p); orb=min(orb,r2); float k=1.18/r2; p*=k; s*=k; }
  return .25*abs(p.y)/s; }
void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float t=T;
  vec3 ro=vec3(.6+.45*cos(t*.11), .08+.18*sin(t*.07+P), 1.+t*.075);
  vec3 ta=ro+vec3(sin(t*.09+P)*.5,.05*cos(t*.13),1.);
  vec3 fw=normalize(ta-ro), rt=normalize(cross(vec3(sin(t*.05)*.3,1,0),fw)), up=cross(fw,rt); vec3 rd=normalize(fw*1.3+uv.x*rt+uv.y*up);
  float d=0., orb; bool hit=false; float g=0.;
  for(int i=0;i<110;i++){ float h=map(ro+rd*d,orb); g+=exp(-h*400.)*.02; if(h<.00025*d){hit=true;break;} d+=h; if(d>4.)break; }
  vec3 col=vec3(.01,.008,.02);
  if(hit){ vec3 p=ro+rd*d; vec2 e=vec2(.0003*d+.00005,0); float o2;
    vec3 n=normalize(vec3(map(p+e.xyy,o2)-map(p-e.xyy,o2),map(p+e.yxy,o2)-map(p-e.yxy,o2),map(p+e.yyx,o2)-map(p-e.yyx,o2)));
    map(p,orb);
    vec3 base=.5+.5*cos(vec3(.0,.7,1.4)+orb*3.2+3.6); base=mix(base,vec3(1.,.8,.5),.25);
    vec3 L=normalize(vec3(.4,.7,-.5)); float dif=max(dot(n,L),0.);
    float ao=clamp(orb*1.6,0.,1.);
    col=base*(.22+dif*1.2)*(.35+.65*ao) + vec3(.4,.7,1.)*pow(1.-max(dot(n,-rd),0.),3.)*.5;
    col*=exp(-d*.35); }
  col+=vec3(.5,.8,1.)*g*.25; col+=vec3(.02,.03,.06)*(1.-exp(-d));
  // 坏像素：一块不属于这里的方块
  vec2 bp=floor(gl_FragCoord.xy/(R.y/36.)); vec2 bc=floor(vec2(.5*R.x,.52*R.y)/(R.y/36.));
  if(Q>0.&&bp==bc){ col=mix(col,vec3(1.,0.,.85),Q); }
  col=aces(col*1.6);
  O=vec4(pow(col,vec3(.9)),1.); }`;
