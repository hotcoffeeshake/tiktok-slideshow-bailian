# 基于百炼 API 的 TikTok 幻灯片生成流程

这个项目把原教程里的 TikTok slideshow 工作流改造成一个本地可运行、去掉 Postiz 的版本。

Postiz 原本负责社媒排期和发布。本项目不做自动发布，而是使用阿里云百炼 API 负责内容策划、hook 生成、幻灯片文案和 Pinterest 搜索词生成；最终素材在本地渲染成 1080x1920 的 PNG 图片，再手动上传到 TikTok。

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

## 为什么用百炼替换 Postiz

Postiz 负责的是分发、排期和发布。本版本不自动连接 TikTok，也不调用社媒发布 API。

百炼在这里负责 AI 策划环节：

- 分析你的领域和目标受众
- 生成可复用的 hook 变体
- 生成适合手机阅读的短文案
- 给出 Pinterest 搜图关键词
- 输出可以被渲染脚本直接读取的 JSON

发布步骤保留为手动操作，这样不需要申请 TikTok API 权限，也不依赖任何社媒排期工具。

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
├── .env.example
├── package.json
├── data/
│   ├── input.example.json
│   └── slides-config.sample.json
├── pinterest_images/
│   └── finance/
├── scripts/
│   ├── generate-plan.mjs
│   └── render-slides.mjs
└── output/
```

## 安全注意事项

不要提交 `.env` 或真实 API Key。项目里的 `.gitignore` 已经排除了 `.env`、`node_modules` 和生成的 `output` 目录。

如果 API Key 曾经被贴到聊天、日志、截图或 Git 历史中，正式使用前建议去百炼控制台轮换或作废旧 Key。

## 参考

- 百炼 OpenAI 兼容接口：`wiki/concepts/openai-compatible-interface.md`
- 百炼 API Key 环境变量：`DASHSCOPE_API_KEY`
- 默认兼容接口地址：`https://dashscope.aliyuncs.com/compatible-mode/v1`

