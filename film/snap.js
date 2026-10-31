// 用法: node snap.js out_dir t1 t2 ...   （按时间截图，jpg）
const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const [out,...ts]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:!process.env.HEADFUL,args:process.env.GPU?['--use-gl=angle','--use-angle='+(process.env.GPU==='1'?'d3d11':process.env.GPU),'--enable-gpu','--ignore-gpu-blocklist','--force_high_performance_gpu','--allow-file-access-from-files','--disable-accelerated-2d-canvas']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--disable-accelerated-2d-canvas','--disable-gpu-rasterization']});
 const p=await b.newPage({viewport:{width:1920,height:1080}});p.setDefaultTimeout(600000);
 p.on('console',m=>console.log('[page]',m.text()));p.on('pageerror',e=>console.log('[err]',e.message));
 await p.goto(require('url').pathToFileURL(require('path').join(__dirname,process.env.PAGE||'film.html')).href);let t0=Date.now();await p.evaluate('initFilm()');console.log('init',Date.now()-t0,'ms');console.log('GPU:',await p.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}));
 for(const t of ts){t0=Date.now();await p.evaluate(`renderFrame(${t})`);const d=await p.evaluate(()=>document.getElementById('c').toDataURL('image/jpeg',.9));
  fs.writeFileSync(`${out}/t_${(+t).toFixed(2)}.jpg`,Buffer.from(d.split(',')[1],'base64'));console.log(t,Date.now()-t0,'ms');}
 await b.close();})();
