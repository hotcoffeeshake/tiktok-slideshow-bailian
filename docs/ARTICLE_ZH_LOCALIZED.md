# 如何用百炼 API 自动化 TikTok 幻灯片内容生产

> 本文是对原英文文章思路的中文本地化改写，不是逐字翻译。原文核心是：从 TikTok 爆款 slideshow 中提取 hook，用 AI 生成变体，找到或生成背景图，再用脚本批量产出可发布素材。这里将原文里的 Claude、Pinterest、Node Canvas、Postiz 组合，替换为本仓库实际可运行的百炼工作流。

## 原文核心思路概括

原文讲的是一条 TikTok slideshow 自动化流水线。它认为 slideshow 比普通短视频更容易规模化，因为不需要拍摄、不需要复杂剪辑，也可以用现成图片快速组合内容。

原流程大致分为六步：

1. 从 TikTok 找同领域正在爆的 slideshow。
2. 下载或截图，分析第一屏 hook。
3. 用 AI 生成同结构的 hook 变体和视觉搜索词。
4. 从 Pinterest 找 9:16 或适合裁切的背景图。
5. 用 Node.js Canvas 把文字批量叠到图片上，导出 PNG。
6. 用 Postiz 做排期或草稿提醒，最后手动发布。

本仓库保留前五步，并把第六步去掉。我们不自动发布，也不接 TikTok API。取而代之的是：百炼负责拆解、策划、生图和生视频，本地脚本负责渲染素材，最后人工上传 TikTok。

## 本地化后的完整工作流

本地化后的流程如下：

```text
爆款拆解 -> 百炼生成内容简报 -> 百炼生成幻灯片方案
       -> 可选：百炼生成背景图 -> 本地渲染 PNG
       -> 可选：百炼生成短视频 -> 手动上传 TikTok
```

对应命令：

```bash
npm run analyze -- data/viral-references.json data/viral-analysis.json data/input.generated.json
npm run plan -- data/input.generated.json data/slides-config.json
npm run images -- data/slides-config.json
npm run render -- data/slides-config.json output
```

如果需要做视频扩展：

```bash
npm run video:create -- data/video-task.json data/video-task.created.json
npm run video:poll -- data/video-task.created.json data/video-task.result.json
```

## 第一步：拆解爆款 slideshow

不要一上来就让模型“帮我写爆款”。更稳的做法是先拆解真实样本。

你需要记录这些信息：

- 链接或来源
- 第一屏文案
- 页数结构
- 每页讲什么
- 视觉风格
- 评论区反馈
- 你认为它爆的原因

把这些内容写入：

```bash
data/viral-references.json
```

可以从示例开始：

```bash
cp data/viral-references.example.json data/viral-references.json
```

然后运行：

```bash
npm run analyze -- data/viral-references.json data/viral-analysis.json data/input.generated.json
```

这个命令会调用百炼文本模型，把爆款样本拆成可复用的 hook 模式、页面结构、视觉模式和避坑点，同时生成下一步需要的内容简报。

## 第二步：生成幻灯片方案

爆款拆解完成后，继续生成具体 slideshow：

```bash
npm run plan -- data/input.generated.json data/slides-config.json
```

输出文件 `data/slides-config.json` 会包含：

- 领域
- Pinterest 搜索词
- TikTok caption
- 每页图片路径
- 每页叠字文案
- 字号、粗细和坐标

它是后续生图和渲染的核心配置文件。

## 第三步：背景图来源

有两种方式。

第一种是手动找图。根据 `slides-config.json` 里的搜索词去 Pinterest 找图，然后保存到对应路径：

```text
pinterest_images/
  finance/
    image_001.jpg
    image_002.jpg
    image_003.jpg
```

第二种是用百炼生图：

```bash
npm run images -- data/slides-config.json
```

这个命令会逐页读取 slide 文案，生成适合做背景的图片 prompt，然后调用百炼图像生成 API，并把图片保存到 `imagePath` 指定的位置。

建议背景图 prompt 遵循这个方向：

```text
9:16 竖版背景图，真实摄影风格，高对比，画面中心留白，
没有文字，没有 logo，没有水印，适合叠加大号白字。
```

## 第四步：本地渲染 TikTok 图片

图片准备好后，运行：

```bash
npm run render -- data/slides-config.json output
```

脚本会生成：

```text
output/
  slide_01.png
  slide_02.png
  slide_03.png
```

这些 PNG 就是可以上传到 TikTok 的 slideshow 素材。

如果只是想测试渲染链路，不想调用百炼，可以运行：

```bash
npm run render -- data/slides-config.sample.json output
```

## 第五步：用百炼扩展成短视频

原英文文章重点是 slideshow，但同一套拆解结果也可以转成短视频。

适合做视频的场景：

- 把第一屏 hook 做成动态背景
- 把一组 slideshow 改成 5 秒短视频
- 用首帧图生成镜头运动
- 做 TikTok / Reels / Shorts 的同主题视频版本

先复制示例：

```bash
cp data/video-task.example.json data/video-task.json
```

创建任务：

```bash
npm run video:create -- data/video-task.json data/video-task.created.json
```

查询任务：

```bash
npm run video:poll -- data/video-task.created.json data/video-task.result.json
```

百炼视频生成是异步任务。如果状态还是 `PENDING` 或 `RUNNING`，隔一会儿继续运行 `video:poll`。成功后脚本会尝试把视频下载到：

```text
output/video/
```

## 和原文方案的主要差异

| 环节 | 原文方案 | 本地化方案 |
| --- | --- | --- |
| 爆款拆解 | Claude 分析截图或内容 | 百炼文本模型 + `npm run analyze` |
| 内容生成 | Claude 生成 hook 和视觉方向 | 百炼生成 `input.generated.json` 和 `slides-config.json` |
| 图片来源 | Pinterest 手动找图 | Pinterest 或百炼生图 |
| 图片渲染 | Node.js Canvas | 本仓库 `render-slides.mjs` |
| 视频扩展 | 原文不是主流程 | 本仓库提供百炼视频任务脚本 |
| 发布排期 | Postiz | 去掉，手动上传 TikTok |

## 为什么去掉 Postiz

Postiz 的价值在于社媒排期、草稿和分发。但这个本地化版本更关注内容生产本身：拆解、生成、渲染和素材产出。

去掉 Postiz 后，流程更轻：

- 不需要连接 TikTok 账号
- 不需要处理发布 API 权限
- 不需要配置社媒 integration
- 不会把自动化发布误判成核心能力

最终发布仍然人工完成。对于新号或测试账号，这种方式也更可控。

## 推荐目录节奏

一次完整生产可以按这个顺序保存文件：

```text
data/viral-references.json      # 人工记录爆款样本
data/viral-analysis.json        # 百炼拆解结果
data/input.generated.json       # 百炼生成的内容简报
data/slides-config.json         # 幻灯片渲染配置
pinterest_images/<niche>/       # 背景图
output/                         # 最终 PNG
output/video/                   # 可选视频结果
```

## 最小可运行命令

只测试本地渲染：

```bash
npm install
npm run render -- data/slides-config.sample.json output
```

跑完整百炼文本链路：

```bash
cp .env.example .env
cp data/viral-references.example.json data/viral-references.json
npm run analyze -- data/viral-references.json data/viral-analysis.json data/input.generated.json
npm run plan -- data/input.generated.json data/slides-config.json
```

再生成图片和渲染：

```bash
npm run images -- data/slides-config.json
npm run render -- data/slides-config.json output
```

## 注意事项

- 不要提交 `.env`。
- API Key 只放在本地环境变量里。
- 百炼图像和视频模型的地域、模型名、Endpoint 必须匹配。
- 视频任务是异步的，不要重复提交同一个任务，拿到 `task_id` 后轮询即可。
- 生成内容不要逐字复制爆款样本，只复用结构和节奏。

