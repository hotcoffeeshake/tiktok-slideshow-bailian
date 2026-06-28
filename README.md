# TikTok Slideshow Pipeline with Bailian API

This repo turns the original TikTok slideshow workflow into a local, Postiz-free pipeline.

Postiz is removed. Bailian API is used for content planning, hook generation, slide copy, and Pinterest search queries. Final media is rendered locally as 1080x1920 PNG files, then uploaded manually to TikTok.

## What This Does

1. Mine viral TikTok slideshow patterns manually.
2. Save the observations in `data/input.json`.
3. Call Bailian through the OpenAI-compatible API.
4. Generate a structured slideshow plan:
   - hook
   - slide text
   - caption
   - Pinterest image search queries
   - `slides-config.json`
5. Render 9:16 PNG slides locally with Node.js Canvas.
6. Upload the finished slides manually to TikTok.

## Why Bailian Replaces Postiz Here

Postiz handled distribution and scheduling. This version does not automate publishing.

Bailian replaces the AI planning part of the workflow:

- analyzes the niche brief
- writes hook variations
- creates short mobile-readable slide copy
- suggests image search terms
- outputs machine-readable JSON for rendering

The publishing step stays manual, which avoids needing social platform API access.

## Requirements

- Node.js 18+
- A Bailian API key
- Pinterest images, or use the built-in fallback backgrounds for testing

Bailian's OpenAI-compatible endpoint uses:

```text
https://dashscope.aliyuncs.com/compatible-mode/v1
```

The API key must be provided through `DASHSCOPE_API_KEY`. Do not hard-code it in source files.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
DASHSCOPE_API_KEY=sk-your-bailian-api-key
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BAILIAN_MODEL=qwen-plus
```

`qwen-plus` is the default because it has a large context window and is suitable for content planning. You can switch to another Bailian model if your account has access.

## Create A Brief

Copy the example:

```bash
cp data/input.example.json data/input.json
```

Edit `data/input.json`:

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

## Generate The Slide Plan

```bash
npm run plan -- data/input.json data/slides-config.json
```

The script writes `data/slides-config.json` and prints Pinterest search queries.

## Add Images

Download Pinterest images manually and place them where the plan expects them:

```text
pinterest_images/
  finance/
    image_001.jpg
    image_002.jpg
    image_003.jpg
```

If an image is missing, the renderer uses a simple fallback background, so the pipeline can still be tested.

## Render Slides

```bash
npm run render -- data/slides-config.json output
```

The finished PNG files are written to:

```text
output/
  slide_01.png
  slide_02.png
  slide_03.png
```

Upload these images to TikTok manually as a slideshow post.

## File Map

```text
.
├── README.md
├── .env.example
├── package.json
├── data/
│   └── input.example.json
├── pinterest_images/
│   └── finance/
├── scripts/
│   ├── generate-plan.mjs
│   └── render-slides.mjs
└── output/
```

## Security

Never commit `.env` or a real API key. The `.gitignore` file excludes `.env`, `node_modules`, and generated output.

If an API key has been pasted into chat, logs, screenshots, or Git history, rotate it in the Bailian console before using this repo seriously.

## References

- Bailian OpenAI-compatible API: `wiki/concepts/openai-compatible-interface.md`
- Bailian API key convention: `DASHSCOPE_API_KEY`
- Default compatible base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

