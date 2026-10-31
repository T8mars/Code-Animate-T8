// ===== 第二幕着色器 =====
// 一镜到底的噪声场：HM = 第 0-3 层倍频，TX2 = 第 4-6 层；Q=层数（连续）
SH.field3d = `
uniform float PIT, ALT, AMP, MODE, REV, CZ, YAW, LIT, WIRE;
float wo(float i){ return clamp(Q-i,0.,1.)*pow(.5,i); }
float Hn(vec2 xz){ vec2 p=xz*.025; vec4 a=texture(HM,p), b=texture(TX2,p);
  return a.x*wo(0.)+a.y*wo(1.)+a.z*wo(2.)+a.w*wo(3.)+b.x*wo(4.)+b.y*wo(5.)+b.z*wo(6.); }
vec3 colorAt(float m, float v, vec2 xz, vec2 uv, float h){
  vec3 c;
  if(m<.5){ float t=clamp(v,0.,1.); c= t<.5? mix(vec3(.02,.035,.07),vec3(.08,.24,.47),t*2.) : mix(vec3(.08,.24,.47),vec3(.95,.77,.43),(t-.5)*2.); c=mix(c,vec3(1.,.95,.85),smoothstep(.93,1.05,t)*.6); }
  else if(m<1.5){ float cc=smoothstep(.45,.8,v); c=mix(vec3(.14,.33,.66),vec3(.5,.7,.93),clamp(uv.y+.5,0.,1.)); c=mix(c,vec3(1.),cc); }
  else if(m<2.5){ float s=sin((xz.x+xz.y*.3)*.45+v*16.); float vv=pow(abs(s),.35); c=mix(vec3(.16,.15,.18),vec3(.96,.94,.9),vv); c=mix(c,vec3(.72,.55,.3),smoothstep(.97,1.,abs(s))*.6); }
  else if(m<3.5){ float f=clamp(v*1.7-(uv.y+.5)*1.05+.2,0.,1.); c=vec3(1.5*f,1.5*f*f*f,f*f*f*f*f*f)*1.35; }
  else { vec3 w=vec3(.04,.18,.36), s=vec3(.85,.78,.55), g=vec3(.22,.4,.17), r=vec3(.42,.36,.3), sn=vec3(.95);
    float t=v; c = t<.44? mix(w*.6,w,t/.44) : t<.47? s : t<.6? mix(g,g*.7,(t-.47)/.13) : t<.7? mix(r,r*.8,(t-.6)/.1) : sn; }
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 ro=vec3(0.,ALT,CZ);
  vec3 fw=normalize(vec3(sin(YAW)*cos(PIT),sin(PIT),cos(YAW)*cos(PIT)));
  vec3 up0=abs(fw.y)>.999?vec3(sin(YAW),0,cos(YAW)):vec3(0,1,0);
  vec3 rt=normalize(cross(up0,fw)), up=cross(fw,rt);
  vec3 rd=normalize(fw*1.5+uv.x*rt+uv.y*up);
  vec3 col=mix(vec3(.01,.015,.03),vec3(.05,.07,.13),clamp(rd.y*2.+.5,0.,1.));
  // 先和包围盒求交（高度 ≤ AMP*0.9）
  float top=AMP*1.4+.01, t=0.;
  if(rd.y<0.){ t=max(0.,(ro.y-top)/(-rd.y)); }
  bool hit=false; vec3 p;
  for(int i=0;i<120;i++){ p=ro+rd*t; float d=p.y-AMP*Hn(p.xz); if(d<.002*t+.002){hit=true;break;} t+=max(.02,d*.5); if(t>400.||p.y<-AMP-1.)break; }
  if(hit){
    float h=Hn(p.xz); float v=h*1.15+.5;
    float m=MODE; float fm=fract(m); float sweep=smoothstep(0.,1.,fm*1.8-(uv.x+.9)*.5);
    vec3 c=mix(colorAt(floor(m),v,p.xz,uv,h), colorAt(floor(m)+1.,v,p.xz,uv,h), sweep);
    float e=.06; vec3 n=normalize(vec3(AMP*(Hn(p.xz-vec2(e,0))-Hn(p.xz+vec2(e,0))),2.*e,AMP*(Hn(p.xz-vec2(0,e))-Hn(p.xz+vec2(0,e)))));
    vec3 sun=normalize(vec3(-.5,.55,.65));
    float dif=max(dot(n,sun),0.);
    vec3 lit=c*(.28+1.05*dif)+vec3(.9,.8,.6)*pow(max(dot(reflect(rd,n),sun),0.),24.)*.15;
    c=mix(c,lit,LIT);
    float fog=1.-exp(-t*.006); c=mix(c,vec3(.05,.07,.12),fog*LIT*.8);
    // 揭开前沿
    float rv=smoothstep(REV+.6,REV-.6,p.z);
    c*=rv; c+=vec3(1.,.82,.45)*exp(-abs(p.z-REV)*3.)*.8*step(REV,1e3)*(1.-step(999.,REV));
    float gl=max(smoothstep(.05,0.,abs(fract(p.x*.5)-.5)),smoothstep(.05,0.,abs(fract(p.z*.5)-.5)));
    c=mix(c,vec3(.45,.95,1.),gl*WIRE); c=mix(c,c*.25,WIRE*.6*(1.-gl));
    col=c;
  }
  col=aces(col*1.1);
  O=vec4(pow(col,vec3(.95)),1.);
}`;

// 金属浮雕奖章：S=光源角，P=转角，Q=推近
SH.medal = `
float relief(vec2 q){ float r=length(q); float m=smoothstep(.79,.76,r);
  float mtn=(fbm(vec3(q*2.2,3.3),5.)*.5+.25)*.13*m;
  float ring=smoothstep(.86,.88,r)*smoothstep(.96,.94,r)*.035;
  float beads=smoothstep(.82,.81,r)*smoothstep(.8,.81,r)*.01;
  return mtn+ring+beads; }
float map(vec3 p){
  float r=length(p.xy);
  return max(r-1., max(-p.z-.09-relief(p.xy), p.z-.09))*.8;
}
vec3 nrm(vec3 p){ vec2 e=vec2(.0015,0); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx))); }
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
vec3 env(vec3 r){ float y=r.y; vec3 c=mix(vec3(.05,.035,.02),vec3(.6,.45,.25),smoothstep(-.3,.6,y)); c+=vec3(1.,.85,.6)*pow(max(dot(r,normalize(vec3(.6,.7,-.4))),0.),12.)*2.; c+=vec3(.5,.6,.9)*pow(max(dot(r,normalize(vec3(-.8,.2,-.3))),0.),6.)*.6; return c; }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float dist=mix(3.6,2.75,Q);
  vec3 ro=vec3(0,0,-dist), rd=normalize(vec3(uv,1.55));
  mat3 M=ry(P)*rx(.12*sin(P*1.3));
  ro=M*ro; rd=M*rd;
  vec3 col=vec3(.012,.01,.012)+vec3(.06,.045,.03)*exp(-length(uv)*2.2);
  float t=0.; bool hit=false;
  for(int i=0;i<110;i++){ float d=map(ro+rd*t); if(d<.0008){hit=true;break;} t+=d*.7; if(t>8.)break; }
  if(hit){
    vec3 p=ro+rd*t, n=nrm(p);
    vec3 L=normalize(vec3(cos(S)*1.2,sin(S)*.8+.3,-1.));
    vec3 gold=vec3(1.,.74,.36);
    float dif=max(dot(n,L),0.); vec3 h=normalize(L-rd); float sp=pow(max(dot(n,h),0.),70.);
    float fr=.35+.65*pow(1.-max(dot(n,-rd),0.),4.);
    vec3 refl=env(reflect(rd,n));
    // 浮雕凹处的暗部（伪 AO）
    float ao=clamp(map(p+n*.03)/.03,0.,1.);
    col=gold*(.04+dif*.55)*ao + gold*refl*fr*.4*(.25+.75*ao) + vec3(1.,.92,.75)*sp*1.4;
  }
  col=aces(col*1.15);
  O=vec4(pow(col,vec3(.92)),1.);
}`;
