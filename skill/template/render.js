// 用法: node render.js <start_s> <end_s> <out.mp4>
const {chromium}=require('playwright'),{spawn}=require('child_process'),fs=require('fs');
(async()=>{const [a,b,out]=[+process.argv[2],+process.argv[3],process.argv[4]];
 const br=await chromium.launch({headless:!process.env.HEADFUL,args:process.env.GPU?['--use-gl=angle','--use-angle='+(process.env.GPU==='1'?'d3d11':process.env.GPU),'--enable-gpu','--ignore-gpu-blocklist','--allow-file-access-from-files','--disable-accelerated-2d-canvas']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--disable-accelerated-2d-canvas','--disable-gpu-rasterization']});
 const p=await br.newPage({viewport:{width:1920,height:1080}});p.setDefaultTimeout(900000);p.on('pageerror',e=>console.log('[err]',e.message));
 await p.goto('file://'+__dirname+'/'+(process.env.PAGE||'film.html'));await p.evaluate('initFilm()');
 const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-c:v','mjpeg','-framerate','30','-i','-','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',out]);
 const f0=Math.round(a*30),f1=Math.round(b*30);let t0=Date.now();
 for(let f=f0;f<f1;f++){const d=await p.evaluate(t=>{renderFrame(t);return document.getElementById('c').toDataURL('image/jpeg',.95)},f/30);
  const buf=Buffer.from(d.slice(d.indexOf(',')+1),'base64');if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if((f-f0)%60==0)console.log(out,f,'/',f1,((Date.now()-t0)/(f-f0+1)).toFixed(0),'ms/f');}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await br.close();fs.writeFileSync(out+'.done',String(f1-f0));console.log('done',out);})();
