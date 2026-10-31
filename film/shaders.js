// ===== 着色器 =====
const SH = {};
// 1. 域扭曲 fbm：墨水 / 大理石 / 金色流体。P=调色方案 0 墨蓝金, 1 金色暗底；Q=亮度
SH.warp = `
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float t=T*.06;
  vec3 p=vec3(uv*1.6,t);
  vec3 q=vec3(fbm(p,5.),fbm(p+vec3(5.2,1.3,2.),5.),0.);
  vec3 r=vec3(fbm(p+3.*q+vec3(1.7,9.2,t*1.5),5.),fbm(p+3.*q+vec3(8.3,2.8,t*1.2),5.),0.);
  float f=fbm(p+3.*r,5.)*.5+.5;
  vec3 col;
  if(P<.5){
    col=mix(vec3(.01,.015,.04),vec3(.03,.08,.22),clamp(f*f*3.,0.,1.));
    col=mix(col,vec3(1.,.72,.32),clamp(length(q)*2.4-.55,0.,1.));
    col=mix(col,vec3(1.,.96,.88),clamp(dot(r,r)*4.5-.35,0.,1.)*.85);
    col+= .18*vec3(.3,.6,1.)*smoothstep(.5,.9,f);
  } else {
    col=mix(vec3(.03,.025,.02),vec3(.35,.22,.08),clamp(f*1.6-.25,0.,1.));
    col=mix(col,vec3(1.,.8,.45),clamp(length(r)*1.4-.45,0.,1.));
    col*=.55;
  }
  col*=Q<.01?1.:Q;
  if(P<.5) col=aces(col*1.45);
  O=vec4(pow(col,vec3(.95)),1.);
}`;
// 2. 倍频叠加：Q=倍频数(连续 1..7)，P=着色模式 0灰 1云 2大理石 3火焰 4地形, S=缩放
SH.octave = `
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 p=vec3(uv*(S<.01?2.2:S)+vec2(3.1,1.7),T*.05);
  float n=fbm(p,Q); float v=n*.5+.5; vec3 col;
  int m=int(P+.5);
  if(m==0){ col=vec3(clamp((v-.5)*1.9+.5,0.,1.)); }
  else if(m==1){ float c=smoothstep(.42,.78,v); col=mix(vec3(.16,.36,.68),vec3(.55,.72,.92),uv.y+.5); col=mix(col,vec3(1.),c); col=mix(col,vec3(.82,.86,.94),c*smoothstep(.75,.5,v)*.4); }
  else if(m==2){ float s=sin((uv.x+uv.y*.3)*9.+n*14.); float vv=pow(abs(s),.35); col=mix(vec3(.18,.17,.2),vec3(.95,.93,.9),vv); col=mix(col,vec3(.7,.55,.3),smoothstep(.97,1.,abs(s))*.6); }
  else if(m==3){ float y=uv.y+.5; float f=v*1.6-y*1.1+.25; f=clamp(f,0.,1.); col=vec3(1.5*f,1.5*f*f*f,f*f*f*f*f*f)*1.3; }
  else { float h=v; vec3 w=vec3(.04,.18,.36), s=vec3(.85,.78,.55), g=vec3(.22,.42,.18), r=vec3(.42,.36,.3), sn=vec3(.95);
    col = h<.47? mix(w*0.6,w,h/.47) : h<.5? s : h<.62? mix(g,g*.7,(h-.5)/.12) : h<.72? mix(r,r*.8,(h-.62)/.1) : sn;
    float sh=fbm(p+vec3(.004,.004,0.),Q)-n; col*=1.-clamp(sh*40.,-.3,.5); }
  O=vec4(col,1.);
}`;
// 3. 高度图地形光线步进。Q=俯仰过渡(0=低空掠过, 1=正上方俯视), P=时间段 0黄昏, S=速度偏移
SH.terrain = `
float hgt(vec2 xz){ return texture(HM, xz*.0055).r*13.; }
vec3 sky(vec3 rd, vec3 sun){
  float s=max(dot(rd,sun),0.);
  vec3 c=mix(vec3(.95,.55,.32),vec3(.12,.2,.42),clamp(rd.y*2.2,0.,1.));
  c=mix(c,vec3(.04,.06,.16),clamp(rd.y*1.2-.25,0.,1.));
  c+=vec3(1.,.6,.3)*pow(s,8.)*.6+vec3(1.,.85,.6)*pow(s,300.)*6.;
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float tt=T*6.+S;
  float pitch=mix(-.13,-1.5707,Q), alt=mix(7.5,95.,Q*Q);
  vec3 ro=vec3(sin(T*.11)*8.,0.,tt);
  float gh=hgt(ro.xz); ro.y=max(gh, hgt(ro.xz+vec2(0,8.)))+alt*(1.-Q)+Q*alt;
  float yaw=sin(T*.13)*.18;
  vec3 fw=normalize(vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch)));
  vec3 up0=abs(fw.y)>.99?vec3(0,0,1):vec3(0,1,0);
  vec3 rt=normalize(cross(up0,fw)), up=cross(fw,rt);
  vec3 rd=normalize(fw*1.5+uv.x*rt+uv.y*up);
  vec3 sun=normalize(vec3(-.28,.12,1.));
  float t=1.; bool hit=false; vec3 p;
  for(int i=0;i<110;i++){ p=ro+rd*t; float d=p.y-hgt(p.xz); if(d<.003*t){hit=true;break;} t+=max(.06,d*.42); if(t>420.)break; }
  vec3 col=sky(rd,sun);
  if(hit){
    float e=.08; float h0=hgt(p.xz);
    vec3 n=normalize(vec3(h0-hgt(p.xz+vec2(e,0)),e,h0-hgt(p.xz+vec2(0,e))));
    float hn=h0/13.; float slope=1.-n.y;
    vec3 grass=vec3(.2,.19,.1), rock=vec3(.34,.28,.23), snow=vec3(.95,.95,1.);
    vec3 alb=mix(grass,rock,smoothstep(.12,.3,slope));
    alb=mix(alb,snow,smoothstep(.62,.7,hn+n.y*.08)*smoothstep(.45,.2,slope));
    float dif=max(dot(n,sun),0.);
    // 软阴影
    float sh=1.; float st=.5; for(int k=0;k<24;k++){ vec3 q=p+sun*st; float dd=q.y-hgt(q.xz); sh=min(sh,10.*dd/st); st+=max(.4,dd*.5); if(sh<0.||st>60.)break; } sh=clamp(sh,0.,1.);
    vec3 lin=vec3(1.5,1.05,.72)*dif*sh*2.1 + vec3(.28,.33,.5)*(.5+.5*n.y)*.7 + vec3(.5,.3,.2)*max(dot(n,-normalize(vec3(sun.x,0.,sun.z))),0.)*.25;
    col=alb*lin;
    float fogA=1.-exp(-t*.0042*(1.-Q*.85));
    vec3 fogc=mix(vec3(.55,.42,.42),vec3(1.,.7,.45),pow(max(dot(rd,sun),0.),6.));
    col=mix(col,fogc,fogA);
  }
  col=aces(col*1.18);
  col=pow(col,vec3(.92));
  O=vec4(col,1.);
}`;
// 4. 星球：P=溶解进度(0 机器球 → 1 有机星球)，T=时间, Q=镜头距离
SH.planet = `
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  float dist=Q<.01?3.:Q;
  vec3 ro=vec3(0,0,-dist), rd=normalize(vec3(uv,1.6));
  vec3 sun=normalize(vec3(-.8,.35,-.45));
  // 背景星空
  vec2 g=floor(gl_FragCoord.xy/3.); float st=hash1(g); vec3 col=vec3(pow(st,180.)*1.6);
  col+=vec3(.05,.07,.16)*(fbm(vec3(uv*1.4,1.),4.)*.5+.5)*.8;
  float b=dot(ro,rd), c=dot(ro,ro)-1., h=b*b-c;
  // 大气外圈辉光
  float closest=length(ro-rd*b);
  float glowO=exp(-max(closest-1.,0.)*9.)*smoothstep(1.,1.6,closest+.6);
  if(h>0.){
    float tt=-b-sqrt(h); vec3 pos=ro+rd*tt; vec3 n=normalize(pos);
    vec3 pp=rotX(.35)*rotY(T*.08)*n;
    // —— 机器球：量化光照 + 经纬线
    float lam=max(dot(n,sun),0.); float band=floor(lam*6.)/6.;
    vec3 mc=vec3(.02,.05,.09)+vec3(.15,.7,.95)*band*.75;
    float lat=asin(pp.y), lon=atan(pp.z,pp.x);
    float lineL=smoothstep(.03,0.,abs(fract(lat*12./3.14159+.5)-.5));
    float lineO=smoothstep(.03,0.,abs(fract(lon*12./6.28318+.5)-.5));
    mc=mix(mc,vec3(.6,.95,1.),max(lineL,lineO)*.8);
    // —— 有机星球
    float cont=fbm(pp*1.9,6.)-.06;
    float hh=fbm(pp*5.,4.)*.3;
    vec3 ocean=mix(vec3(.01,.06,.16),vec3(.02,.16,.3),smoothstep(-.25,0.,cont));
    vec3 land=mix(vec3(.16,.26,.09),vec3(.42,.35,.22),smoothstep(.05,.3,cont+hh));
    land=mix(land,vec3(.75,.68,.5),smoothstep(.0,-.08,-abs(pp.y)+.15)*0.);
    float ice=smoothstep(.72,.82,abs(pp.y)+hh*.3);
    vec3 surf=cont>0.?land:ocean; surf=mix(surf,vec3(.92,.95,1.),ice);
    float cl=smoothstep(.1,.34,fbm(pp*3.2+vec3(T*.02,0,0),6.)+.02);
    float dif=max(dot(n,sun),0.);
    vec3 oc=surf*(dif*1.6+.03);
    vec3 hv=normalize(sun-rd); float spec=cont>0.?0.:pow(max(dot(n,hv),0.),60.)*.8*dif;
    oc+=vec3(1.,.85,.6)*spec;
    oc=mix(oc,vec3(1.)*(dif*1.3+.04),cl*.85);
    float fres=pow(1.-max(dot(n,-rd),0.),3.);
    oc+=vec3(.3,.55,1.)*fres*(dif*.9+.1)*1.2;
    // 夜面城市灯光（暖金点）
    float city=smoothstep(.62,.9,gnoise(pp*40.)*.5+.5)*(cont>0.?1.:0.)*(1.-cl)*smoothstep(.1,-.1,dot(n,sun));
    oc+=vec3(1.,.75,.35)*city*.9;
    // —— 溶解
    float dn=fbm(pp*2.6+vec3(4.),5.)*.5+.5;
    float m=smoothstep(P-.03,P+.03,1.-dn);
    m = P<=0.?0.:P>=1.?1.:smoothstep(dn-.03,dn+.03,P*1.15-.05);
    float edge=exp(-abs(dn-(P*1.15-.05))*60.)*(P>0.&&P<1.?1.:0.);
    col=mix(mc,oc,m)+vec3(1.,.72,.3)*edge*1.6;
  }
  col+=vec3(.3,.55,1.)*glowO*.55*smoothstep(0.,.4,P);
  col+=vec3(.2,.8,1.)*glowO*.25*(1.-smoothstep(0.,.4,P));
  col=aces(col*1.1);
  O=vec4(pow(col,vec3(.95)),1.);
}`;
// 5. 演示场景式隧道（蒙太奇用）
SH.tunnel = `
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float a=atan(uv.y,uv.x), r=length(uv);
  float z=.35/r+T*2.2, ang=a/3.14159*4.+T*.4;
  float ch=mod(floor(z*2.)+floor(ang*2.),2.);
  vec3 col=mix(vec3(.9,.2,.55),vec3(.15,.85,1.),ch)*(.35+.65*fract(z));
  col*=smoothstep(0.,.5,r)*1.2;
  col+=vec3(1.,.9,.6)*smoothstep(.08,.0,r);
  float scan=.85+.15*sin(gl_FragCoord.y*3.14159);
  O=vec4(col*scan,1.);
}`;
