# PixelFishing

一个本地运行的像素风海岸与自动路亚钓鱼场景。采用原生 WebGL、JavaScript 和 GLSL，无前端构建步骤、CDN 或运行时第三方依赖。

## 效果与交互

- 风平浪静的像素海面、动态颗粒、沙滩、椰子树、杂草、飞鸟与缓慢向右漂移的云。
- 60 秒完成 24 小时昼夜循环，太阳、月亮、星空和场景照明同步变化。
- 可左右拖动的小帆船，自动贴着水面起伏；也可以点击水面指定航行位置。
- 水下鱼群会转向、加速、分散并避让船只。
- 自动抛投路亚、追饵、咬钩和拉锯。每次拉锯独立以 50% 概率成功收鱼，否则脱钩逃走。
- 像素钓鱼人、随拉力弯曲的路亚竿与鱼线。夜光鱼饵照亮附近海水、泡沫和鱼体。
- 沙滩篝火白天熄灭、夜晚点燃，带暖色局部照明、火焰和上升火星。

这是针对固定侧面机位的 2.5D 风格重建，采用程序化视觉近似，不是完整流体模拟或任意视角三维海洋。

## 本地运行

安装 Node.js 18 或更高版本，并使用支持 WebGL、启用硬件加速的浏览器。

```sh
node server.mjs
```

打开 http://127.0.0.1:5173 。Windows 用户也可以双击 `start.bat`。服务仅监听本机，无需互联网连接；关闭运行窗口或按 Ctrl+C 停止。

### 操作

| 操作 | 效果 |
| --- | --- |
| 拖动小船 / 点击水面 | 小船左右航行，不能手动纵向移动 |
| 拖动天空或按住 Shift 拖动水面 | 平移视角 |
| 滚轮 | 缩放 |
| H / 右上角设置按钮 | 显示或隐藏调节面板 |
| 面板滑块 | 调整浪高、海浪速度和像素大小 |
| 暂停海浪 | 暂停海浪、鱼群和钓鱼；昼夜仍继续 |

钓鱼自动循环，无需额外点击；左下角显示钓鱼状态和累计钓获数。16:9 窗口最接近参考构图。

## 项目结构

```text
dist/
  index.html, style.css       页面与控制面板
  coast.js                   WebGL 渲染与交互
  motion.js                  船只与鱼群运动
  fishing.js                 自动路亚钓鱼状态机
  clouds.js                  简单云矩形几何
  shaders/                   场景、粒子、照明着色器
server.mjs                   本地静态服务器
start.bat                    Windows 启动入口
tools/                       逻辑测试、离屏渲染和视频分析
requirements-dev.txt         可选开发工具依赖
```

## 验证与开发工具（可选）

网页运行不需要 Python。验证鱼群、小船、钓鱼逻辑并准备预览输入：

```sh
node --check dist/coast.js
node tools/prepare-preview.cjs
```

离屏 GPU 渲染需要 Python 3.10+ 和可用的 OpenGL 驱动：

```sh
python -m pip install --target .tools/python -r requirements-dev.txt
python tools/verify_render.py
python tools/verify-clouds.py
python tools/verify-lure-light.py
python tools/verify-campfire.py
```

生成的图片、预览视频和中间数据保存在 `analysis/`，不会提交。离屏测试会将 GLSL ES 的接口声明转换为桌面 GLSL；它验证着色器和画面，不等同于浏览器交互验收。不同浏览器与显卡仍需实际体验确认。

`tools/analyze_video.py` 仅用于分析本地参考 MP4；不是运行或测试场景的必需步骤。

## 视觉参考

本项目的像素海岸、侧面机位和海浪色彩受到 **Surf Sandbox** 视频的启发：

[The Most Relaxing Surfing Game Ever? — Surf Sandbox](https://www.youtube.com/watch?v=4t6VF38VYzw)

本项目是独立实现的风格练习，并非原游戏源码或官方项目。仓库仅记录参考链接，不包含原视频、视频抽帧、本地预览视频或本地开发依赖。场景中的图形由代码生成。
