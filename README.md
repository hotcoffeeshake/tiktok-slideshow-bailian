# 基于百炼 API 的 TikTok 幻灯片生成流程

这个项目把原教程里的 TikTok slideshow 工作流改造成一个本地可运行、去掉 Postiz 的版本。

Postiz 原本负责社媒排期和发布。本项目不做自动发布，而是使用阿里云百炼 API 负责内容策划、hook 生成、幻灯片文案和 Pinterest 搜索词生成；最终素材在本地渲染成 1080x1920 的 PNG 图片，再手动上传到 TikTok。

如果想看更接近文章形式的中文本地化说明，见 [docs/ARTICLE_ZH_LOCALIZED.md](docs/ARTICLE_ZH_LOCALIZED.md)。

## 可以做什么

1. 手动观察 TikTok 上同领域的爆款 slideshow。
2. 把观察结果写入 `data/input.json`。
3. 通过百炼 OpenAI 兼容接口调用模型。
4. 生成结构化 slideshow 方案：
   - 开头 hook
   - 每页幻灯片文案
   - TikTok caption
   - Pinterest 图片搜索词
   - `slides-config.json`
5. 使用 Node.js Canvas 在本地渲染 9:16 PNG 图片。
6. 将生成好的图片手动上传到 TikTok，发布为 slideshow。
7. 可选：用百炼图像生成 API 代替 Pinterest 找图。
8. 可选：用百炼视频生成 API 把某一页或整组主题扩展成短视频。

## 为什么用百炼替换 Postiz

Postiz 负责的是分发、排期和发布。本版本不自动连接 TikTok，也不调用社媒发布 API。

百炼在这里负责 AI 策划环节：

- 分析你的领域和目标受众
- 生成可复用的 hook 变体
- 生成适合手机阅读的短文案
- 给出 Pinterest 搜图关键词
- 输出可以被渲染脚本直接读取的 JSON

发布步骤保留为手动操作，这样不需要申请 TikTok API 权限，也不依赖任何社媒排期工具。

## 爆款拆解工作流

爆款拆解不是复制原文案，而是提取可复用结构。建议把每条参考内容拆成「可观察事实」和「策略判断」两层，避免凭感觉总结。

### 1. 找参考内容

在 TikTok 里按细分领域搜索，例如：

- `StudyTok`
- `GymTok`
- `BookTok`
- `FinTok`
- 你的产品关键词或用户痛点关键词

优先看最近仍在增长的 slideshow，而不是只看历史大爆款。记录每条内容的链接、发布时间、点赞/收藏/评论、第一屏截图和完整页数。

### 2. 拆第一屏 hook

第一屏决定是否停留。拆解时至少记录：

- 第一屏主文案：原样记录，不直接复用。
- hook 类型：问题、强断言、反常识、数字结果、身份点名、痛点放大、FOMO。
- 情绪触发：好奇、焦虑、共鸣、羞耻、希望、贪婪、紧迫。
- 视觉框架：人物、场景、物件、截图、暗色/亮色、高对比/低对比。
- 信息缺口：用户为什么会想继续翻下一页。

### 3. 拆页面结构

常见 slideshow 结构：

```text
Slide 1: HOOK
Slide 2: 问题 / 背景 / 反常识
Slide 3: 关键点 1
Slide 4: 关键点 2
Slide 5: 关键点 3
Slide 6: CTA，如 Save / Follow / Comment
```

适合录入 `sourceSlideshowNotes` 的格式：

```json
[
  "第一屏使用数字结果型 hook：I saved $5k in 6 months。",
  "第二屏指出常见错误：Most people save what is left over。",
  "中间页每页只讲一个动作，句子短，居中大字。",
  "视觉风格是暗色、高对比、生活方式图片，画面文字少。",
  "最后一页 CTA 是 Save this before payday。"
]
```

### 4. 让百炼生成可复用变体

把参考内容写入 `data/viral-references.json`，先运行爆款拆解：

```bash
cp data/viral-references.example.json data/viral-references.json
npm run analyze -- data/viral-references.json data/viral-analysis.json data/input.generated.json
```

这个命令会生成两个文件：

- `data/viral-analysis.json`：可复用的 hook、结构、视觉和避坑总结
- `data/input.generated.json`：可以直接喂给 slideshow planner 的内容简报

然后继续生成 slideshow 方案：

```bash
npm run plan -- data/input.generated.json data/slides-config.json
```

百炼会把观察结果转成新的 hook、页面文案、caption 和 Pinterest 搜索词。注意：这里生成的是结构化变体，不应该逐字照抄参考内容。

## 生图工作流：用百炼替代 Pinterest

默认流程是从 Pinterest 找图。如果你想完全自动化图片来源，可以用百炼图像生成 API 生成每页背景图，再把下载后的图片放进 `pinterest_images/<niche>/`。

适用场景：

- 找不到合适的 Pinterest 图片
- 需要统一视觉风格
- 需要带特定场景、人物、产品或文字的背景图
- 想生成海报感更强的 slideshow 背景

### 推荐流程

1. 用 `npm run plan` 生成 `data/slides-config.json`。
2. 从每页文案提炼一条背景图 prompt。
3. 调用百炼图像生成接口。
4. 下载返回的图片 URL。
5. 保存为：

```text
pinterest_images/
  finance/
    image_001.jpg
    image_002.jpg
    image_003.jpg
```

6. 再运行本地渲染：

```bash
npm run images -- data/slides-config.json
npm run render -- data/slides-config.json output
```

`npm run images` 会逐页调用百炼图像生成 API，并把图片保存到每页 `imagePath` 指向的位置。生成完成后，`render` 会把这些背景图和文字叠加成最终 PNG。

### 背景图 prompt 模板

```text
9:16 vertical TikTok slideshow background, dark luxury lifestyle photography,
minimal objects, strong contrast, clean empty center area for text overlay,
no visible text, no watermark, cinematic lighting, realistic texture.
Topic: [THIS SLIDE TOPIC]
Emotion: [curiosity / anxiety / hope / FOMO]
```

### 百炼同步生图示例

千问图像系列、万相 2.6/2.7、Z-Image 等新版图像模型支持同步调用。千问图像系列适合复杂文字和海报风格，但如果后续还要用本项目叠字，建议 prompt 里明确 `no visible text`，避免背景图自带文字干扰。

```bash
curl --location 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
  --data '{
    "model": "qwen-image-2.0-pro",
    "input": {
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "text": "9:16 vertical TikTok slideshow background, dark luxury lifestyle photography, minimal objects, strong contrast, clean empty center area for text overlay, no visible text, no watermark, cinematic lighting, realistic texture. Topic: saving money before payday."
            }
          ]
        }
      ]
    },
    "parameters": {
      "negative_prompt": "low resolution, blurry, distorted hands, extra fingers, messy composition, visible text, watermark, oversaturated, waxy face, obvious AI look",
      "prompt_extend": true,
      "watermark": false,
      "size": "1080*1920"
    }
  }'
```

注意：

- `{WorkspaceId}` 替换为你的百炼业务空间 ID。
- 模型、Endpoint、API Key 必须属于同一地域。
- 图像结果 URL 通常需要及时下载保存，不要长期依赖临时链接。
- 如果使用仅支持异步的图像模型，需要加 `X-DashScope-Async: enable`，拿到 `task_id` 后轮询 `GET /api/v1/tasks/{task_id}`。

## 生视频工作流：把 slideshow 主题扩展成短视频

视频生成不是本项目当前脚本的必需环节，但可以作为扩展：先用 slideshow 工作流得到 hook、分镜和视觉方向，再用百炼视频生成 API 生成 5-15 秒短视频素材。

适用场景：

- 把爆款 slideshow 改成短视频版本
- 给第一屏 hook 做动态背景
- 为 TikTok、Reels、Shorts 生成同主题视频
- 用首帧图生成一段镜头运动视频

### 推荐流程

1. 先完成爆款拆解，得到 hook 和每页主题。
2. 用百炼生成或手动准备首帧图。
3. 选择视频模式：
   - 文生视频：只有文字描述时使用。
   - 图生视频：已有首帧图，希望让画面动起来。
   - 首尾帧视频：希望控制开头和结尾构图。
   - 参考生视频：需要保持角色、产品或视觉风格一致。
4. 创建视频异步任务。
5. 轮询 `task_id` 拿到视频 URL。
6. 下载视频，手动上传 TikTok，或作为 slideshow 背景素材二次编辑。

本仓库提供两个命令：

```bash
cp data/video-task.example.json data/video-task.json
npm run video:create -- data/video-task.json data/video-task.created.json
npm run video:poll -- data/video-task.created.json data/video-task.result.json
```

- `video:create`：创建百炼视频异步任务，输出 `task_id`
- `video:poll`：查询任务状态；如果任务成功并返回视频 URL，会下载到 `output/video/`

如果任务仍是 `PENDING` 或 `RUNNING`，间隔一段时间后再次运行 `video:poll`。

### 视频 prompt 模板

```text
[主体/场景] + [动作] + [环境描述] + [镜头语言] + [视觉风格]

示例：
A young professional checking a budgeting app at night, city apartment,
slow push-in camera movement, dark luxury lifestyle lighting,
realistic cinematic style, high contrast, no text, no watermark.
```

### 百炼文生视频示例

百炼视频生成统一采用异步任务：创建任务拿 `task_id`，再轮询查询结果。视频通常耗时 1-5 分钟，视频编辑类可能更久。

```bash
curl --location 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
  -H 'X-DashScope-Async: enable' \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "wan2.7-t2v",
    "input": {
      "prompt": "A young professional checking a budgeting app at night in a city apartment. Slow push-in camera movement, dark luxury lifestyle lighting, realistic cinematic style, high contrast, no visible text, no watermark."
    },
    "parameters": {
      "resolution": "720P",
      "ratio": "9:16",
      "prompt_extend": true,
      "watermark": false,
      "duration": 5
    }
  }'
```

查询任务：

```bash
curl -X GET 'https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}' \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY"
```

注意：

- 视频生成必须带 `X-DashScope-Async: enable`。
- `task_id` 通常 24 小时有效，请勿重复提交同一个任务，直接轮询。
- 不同模型参数不同：万相多用 `resolution`，PixVerse/Vidu 多用 `size`，可灵常用 `aspect_ratio`。
- `wan2.7-*` 属于新版协议，旧版 `wan2.6-*` / `wanx2.1-*` 不要混用。
- 部分模型走 `/api/v1/services/aigc/image2video/video-synthesis`，调用前要核对模型文档。

## 环境要求

- Node.js 18 或更高版本
- 阿里云百炼 API Key
- Pinterest 图片素材；如果只是测试，也可以不放图片，脚本会自动使用内置 fallback 背景

百炼 OpenAI 兼容接口默认地址：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

API Key 必须通过环境变量 `DASHSCOPE_API_KEY` 传入，不要硬编码到源码里。

## 安装

```bash
npm install
cp .env.example .env
```

编辑 `.env`：

```bash
DASHSCOPE_API_KEY=sk-your-bailian-api-key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen-plus
BAILIAN_NATIVE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
BAILIAN_IMAGE_MODEL=qwen-image-2.0-pro
BAILIAN_IMAGE_SIZE=1080*1920
BAILIAN_VIDEO_MODEL=wan2.7-t2v
BAILIAN_VIDEO_RESOLUTION=720P
BAILIAN_VIDEO_RATIO=9:16
BAILIAN_VIDEO_DURATION=5
```

默认模型是 `qwen-plus`，因为它上下文窗口较大，适合做内容规划。如果你的百炼账号有其他模型权限，也可以自行替换。

## 创建内容简报

复制示例文件：

```bash
cp data/input.example.json data/input.json
```

编辑 `data/input.json`：

```json
{
  "niche": "personal finance",
  "language": "English",
  "audience": "young professionals who want simple saving habits",
  "desiredSlideCount": 6,
  "sourceSlideshowNotes": [
    "First slide claims a surprising savings result.",
    "Middle slides explain one practical habit per slide.",
    "Visual style is dark, high contrast, luxury lifestyle, clean centered text."
  ],
  "goal": "Create a TikTok slideshow that teaches one simple money habit."
}
```

字段说明：

- `niche`：内容领域
- `language`：输出语言
- `audience`：目标受众
- `desiredSlideCount`：希望生成的幻灯片页数
- `sourceSlideshowNotes`：你从爆款视频里观察到的结构、文案和视觉风格
- `goal`：这组 slideshow 想达成的内容目标

## 生成幻灯片方案

```bash
npm run plan -- data/input.json data/slides-config.json
```

脚本会调用百炼 API，生成 `data/slides-config.json`，并在终端输出 Pinterest 搜索词。

## 添加图片素材

根据生成的 Pinterest 搜索词，手动下载图片，并放到配置里对应的路径。

示例：

```text
pinterest_images/
  finance/
    image_001.jpg
    image_002.jpg
    image_003.jpg
```

如果某张图片不存在，渲染脚本会使用简单的 fallback 背景，因此即使没有图片也可以先跑通流程。

## 渲染幻灯片

```bash
npm run render -- data/slides-config.json output
```

生成结果会输出到：

```text
output/
  slide_01.png
  slide_02.png
  slide_03.png
```

之后将这些图片手动上传到 TikTok，发布为 slideshow。

## 不调用百炼的本地测试

如果只是想验证渲染链路，可以直接使用示例配置：

```bash
npm run render -- data/slides-config.sample.json output
```

这一步不需要 API Key，也不会消耗百炼额度。

## 文件结构

```text
.
├── README.md
├── docs/
│   └── ARTICLE_ZH_LOCALIZED.md
├── .env.example
├── package.json
├── data/
│   ├── input.example.json
│   ├── slides-config.sample.json
│   ├── viral-references.example.json
│   └── video-task.example.json
├── pinterest_images/
│   └── finance/
├── scripts/
│   ├── analyze-viral.mjs
│   ├── create-video-task.mjs
│   ├── generate-images.mjs
│   ├── generate-plan.mjs
│   ├── poll-task.mjs
│   └── render-slides.mjs
└── output/
```

## 安全注意事项

不要提交 `.env` 或真实 API Key。项目里的 `.gitignore` 已经排除了 `.env`、`node_modules` 和生成的 `output` 目录。

如果 API Key 曾经被贴到聊天、日志、截图或 Git 历史中，正式使用前建议去百炼控制台轮换或作废旧 Key。

## 参考

- 百炼 OpenAI 兼容接口：`wiki/concepts/openai-compatible-interface.md`
- 百炼图像生成 API：`wiki/api/image-generation.md`
- 百炼视频生成 API：`wiki/api/video-generation-api.md`
- 百炼异步调用机制：`wiki/concepts/async-invocation.md`
- 图像、视频与 3D 生成对比：`wiki/comparisons/multimodal-generation-comparison.md`
- 百炼 API Key 环境变量：`DASHSCOPE_API_KEY`
- 默认兼容接口地址：`https://dashscope.aliyuncs.com/compatible-mode/v1`
