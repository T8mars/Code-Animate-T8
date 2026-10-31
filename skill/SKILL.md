---
name: code-film
description: 用纯代码（Canvas2D + WebGL 着色器）做视频：片头、动态海报、风格短片、知识片的画面。说「用某种风格做个 N 秒片头/短片」时使用；输出 1080p mp4，没有拍摄素材、不用视频生成模型。
---

# 写出来的影像：用代码做视频

这份 SKILL 来自 B 站影片《写出来的影像》的制作过程：全片约 18 分钟，每一帧都是 Claude 写的代码画出来的。片子里用到的二十多种画法、骑自行车的鹈鹕、文字之城，源码都在开源仓库（https://github.com/T8mars/Code-Animate-T8）根目录的 `../film/` 文件夹（和本 SKILL 所在的 `skill/` 同级，下文写作 `../film/`）；只拿到 SKILL 文件夹时，画法库就当作做法说明来用。这里给的是**从零做一条新片子**的最短路径，已由一个全新的 Claude 只看本文件实测：一句话到 10 秒成片约 4.5 分钟（纯 CPU）。

## 什么时候用
- 「用演示场景的风格做个 10 秒片头」「做一段浮世绘风格的鹈鹕骑车」「把这段数据做成 20 秒动态图」
- 需要可复现、可改参数、能开源的画面；不需要真实人脸和真人表演（这两样代码画不好，别硬做）

## 环境
- Node.js 18+、ffmpeg；在 `template/` 里运行 `npm install`，再运行 `npx playwright install chromium`
- 有独立显卡：渲染时加环境变量 `GPU=1`（Windows 用 D3D11；macOS 用 `GPU=metal`）。没有显卡也能渲，走 CPU 软件渲染，慢 10–50 倍
- 可选：Python 3 + librosa（按音乐节拍对齐画面）

## 工作流程（每一步都要做，别跳）
1. **定风格和时长**。从下面的「画法库」里挑一种，或者组合两种。时长换算成帧：30fps，10 秒 = 300 帧。
2. **写 `template/scene.js`**（从示例改起最快）。页面必须提供两个全局函数，render.js / snap.js 会调用：
   - `window.initFilm = async () => {...}`：建 WebGL、编译着色器、**显式加载字体**（`await document.fonts.load('400 96px "JetBrains Mono"')`，只等 `document.fonts.ready` 可能等不到懒加载的字体），返回任意值。
   - `window.renderFrame = t => {...}`：把第 t 秒画到 `#c` 画布（1920×1080）。必须是确定性的：同一个 t 永远画出同一帧，随机数用 `mulberry(seed)`，不要用 `Math.random()`。
   - 着色器：`const G = makeGL(1280, 720); G.add('名字', body)`。`body` 里自己写 `void main(){ ... O = vec4(col,1.); }`；可直接用内置 uniform `R`（分辨率）、`T` `P` `Q` `S`（浮点参数）和 `lib.js` 里 `GLSL_HEAD` 的函数（`gnoise`、`fbm`、`aces`、`hash1`）。自定义 uniform 自己声明，调用时 `G.run('名字', {T: t, P: 1, U: {myUniform: 0.5}})`，返回一个离屏 canvas，用 `ctx.drawImage(canvas, 0, 0, W, H)` 画到主画布。
   - 字体：`film.html` 里声明了 JetBrains Mono（400/700）、Space Grotesk（600）、Cormorant Garamond（500）；用别的字重会被浏览器合成，效果变差。
3. **先看静帧，再渲染**。`node snap.js out_dir 0.5 2 4 6 8 9.5` 截几张（存成 `out_dir/t_秒数.jpg`），逐张看：构图、字号（上屏文字 ≥36px，代码 ≥30px）、有没有穿帮。不满意就改代码再截，直到满意。
4. **渲染**：`node render.js 0 10 out.mp4`（GPU 加 `GPU=1`）。成功后会多一个 `out.mp4.done` 标记文件（分段渲染时用来断点续跑，可以删）。长片按镜头分段渲染再用 ffmpeg concat 拼接。
5. **配乐（可选）**：把音乐的节拍时间读出来（librosa beat_track），让切换和冲击点落在实测拍点上，误差不超过一帧；不要按 BPM 估算。
6. **交付前自查**：200% 检查 = 从静帧里裁一块 480×270 再放大到 960×540 看（`ffmpeg -i t_4.00.jpg -vf crop=480:270:720:400,scale=960:540 zoom.jpg`），找锯齿、色带；任何镜头静止不超过 2 秒；最后一秒不要突然黑。

## 画法库（片中实际用到的，源码在 `../film/`）
| 画法 | 关键做法 | 源码 |
|---|---|---|
| 演示场景隧道 + 正弦滚动字 + 彩虹光栅条 | 极坐标棋盘格 `0.3/r + t`；逐字 sin 偏移；渐变条 | `template/scene.js`（示例），`../film/act3.js`、`../film/sh_a3.js` |
| 距离场建模（Shadertoy 式） | `smin` 平滑合并球、环、地面；步数热力图做调试视图 | `../film/sh_a3.js` 的 `SH.sdf` |
| 噪声山脉、云、大理石、火焰 | 预计算倍频噪声纹理，再光线步进高度场；同一函数换着色 | `../film/sh_a2.js` 的 `SH.field3d` |
| 机器球 → 有机星球 | 量化光照 + 经纬线，按噪声阈值溶解成大陆、云、城市灯光 | `../film/shaders.js` 的 `SH.planet` |
| 谐波光笼（惠特尼） | 第 i 个点以 i 倍角速度转，周期性排成花瓣 | `../film/act2.js` 的 `cagePhi` |
| 诡盘、默片、纸板舞台、手绘胶片 | 缝的宽度 = 快门；16 格/秒 + 划痕 + 闪烁；按拍变魔术 | `../film/act1.js` |
| 抽象几何（视觉音乐） | 具象画布逐步换成圆、线、色块，再让音乐响度驱动 | `../film/act1.js` 的 `GEO` |
| 数据混合（datamosh） | 16px 块按运动向量搬运上一帧，不刷新关键帧 | `../film/act3.js` 的 `MOSH` |
| 二十种艺术风格的鹈鹕 | 每个风格 = 背景函数 + 鹈鹕配色 + 后期（像素化、颗粒） | `../film/cold.js` 的 `world(...)` |
| 文字之城 | 世界坐标里铺字形图集，文本就是着色器自己的源码 | `../film/textcity2.js` |
| 骑自行车的鹈鹕 | 参数化矢量造型，`wheel` 改车轮大小，`bad` 生成翻车版 | `template/pelican.js` |

## 经验（片子里真实踩过的坑）
- 无显卡环境：`render.js`/`snap.js` 已经默认加了 `--disable-accelerated-2d-canvas --disable-gpu-rasterization`（二维画布快 20 倍以上），并用 `canvas.toDataURL` 管道给 ffmpeg 抓帧；自己另写渲染脚本时照抄这两点。
- 光线步进的山顶缺块：求交起点的包围高度要留够余量（`top = AMP*1.4`）。
- 有状态的镜头（粒子、数据混合）：从镜头起点按帧号重算，渲染分段不能把这种镜头切开。
- 文字放在高亮背景上一律垫半透明暗底。

## 一句话示例
> 用演示场景的风格做个 10 秒片头，滚动字幕写「HELLO 2026」

按上面的流程：改 `scene.js` 里的 `msg` 和配色 → 截 5 张静帧检查 → `node render.js 0 10 intro.mp4`。
