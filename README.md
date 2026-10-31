# 写出来的影像 · Written Film

B 站影片《写出来的影像》的全部画面源码：约 18 分钟，每一帧都是代码实时画出来的（Canvas2D + WebGL 着色器），没有拍摄素材，没有用视频生成模型。由 T8star 和 Claude 一起制作。

仓库地址：https://github.com/T8mars/Code-Animate-T8

## 目录
- `film/` 全片画面。`film.html` 一页装下全片，`renderFrame(t)` 给出第 t 秒的画面。
  - `cold.js` 冷开场（鹈鹕骑过二十个时代）、`act1.js`–`act4.js` 四幕、`end.js` 尾声
  - `textcity2.js` 文字之城（字形铺在世界坐标里，文本就是这段着色器自己的源码）
  - `pelican.js` 骑自行车的鹈鹕；`shaders.js` `sh_a2.js` `sh_a3.js` 着色器
- `tools/` 口播对齐、时间线、混音、拼片脚本
- `skill/` 送给观众的 SKILL：从零做一条代码影片的最短路径；长片骨架（镜头时间线、有状态镜头、分段渲染）、双语字幕，以及自动质检工具（卡顿/抖动检测、口播校对、字幕检查、接触表），说明见 `skill/TOOLS.md`
- `docs/` 史实核查（每个故事的来源）、字幕（中英双语 / 中文 / 英文三份 SRT）

## 自己渲染
```
cd film
npm install && npx playwright install chromium
node snap.js shots 93 300 470        # 截几张静帧看看
node render.js 441 477 planet.mp4    # 渲染一段（有独立显卡加 GPU=1）
```
`timeline.js` 和 `music_env.js` 是由口播和配乐生成的时间数据；口播录音和配乐文件不在仓库里。

`tools/` 里的脚本默认在当前目录找工程文件（`voice/` `align/` `music/`），可以用环境变量 `FILM_PROJECT` 指定工程目录、`FILM_SFX` 指定音效目录。

## 说明
- 片中借用画法的公有领域作品：撒哈拉岩画、汉画像石、宋画、葛饰北斋、梵高、蒙克；构图均为原创。
- 鹈鹕测试由 Simon Willison 提出（2024）。
- 字体：思源黑体/宋体（Noto CJK）、JetBrains Mono、Space Grotesk、Cormorant Garamond（均为 SIL OFL）。
