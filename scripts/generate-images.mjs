import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const configPath = process.argv[2] || "data/slides-config.json";
const nativeBaseURL = (process.env.BAILIAN_NATIVE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");
const imageModel = process.env.BAILIAN_IMAGE_MODEL || "qwen-image-2.0-pro";
const imageSize = process.env.BAILIAN_IMAGE_SIZE || "1080*1920";
const apiKey = process.env.DASHSCOPE_API_KEY;

if (!apiKey) {
  console.error("Missing DASHSCOPE_API_KEY. Copy .env.example to .env and set your Bailian API key.");
  process.exit(1);
}

if (!existsSync(configPath)) {
  console.error(`Missing ${configPath}. Run npm run plan first, or pass a sample config.`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(configPath, "utf8"));
const slides = Array.isArray(plan) ? plan : plan.slides;

if (!Array.isArray(slides) || slides.length === 0) {
  console.error("slides-config must be an array or an object with a slides array.");
  process.exit(1);
}

function lineText(slide) {
  return (slide.lines || []).map((line) => line.text).filter(Boolean).join(" / ");
}

function imagePrompt(slide, index) {
  if (slide.imagePrompt) return slide.imagePrompt;
  const query = Array.isArray(plan.pinterestQueries) ? plan.pinterestQueries[index % plan.pinterestQueries.length] : "";
  return [
    "9:16 vertical TikTok slideshow background.",
    "Realistic lifestyle photography, strong contrast, clean empty center area for text overlay.",
    "No visible text, no watermark, no logo.",
    query ? `Visual direction: ${query}.` : "",
    `Slide topic: ${lineText(slide)}.`
  ].filter(Boolean).join(" ");
}

function collectUrls(value, urls = []) {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value) && (/\.(png|jpe?g|webp)(\?|$)/i.test(value) || value.includes("oss"))) {
      urls.push(value);
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, urls);
    return urls;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectUrls(item, urls);
  }
  return urls;
}

async function requestImage(prompt) {
  const response = await fetch(`${nativeBaseURL}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: imageModel,
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }]
          }
        ]
      },
      parameters: {
        negative_prompt:
          process.env.BAILIAN_IMAGE_NEGATIVE_PROMPT ||
          "low resolution, blurry, distorted hands, extra fingers, messy composition, visible text, watermark, logo, oversaturated, obvious AI look",
        prompt_extend: process.env.BAILIAN_IMAGE_PROMPT_EXTEND !== "false",
        watermark: false,
        size: imageSize
      }
    })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Image request failed: ${response.status} ${JSON.stringify(json)}`);
  }

  const [url] = collectUrls(json);
  if (!url) throw new Error(`No image URL found in response: ${JSON.stringify(json)}`);
  return url;
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, bytes);
}

for (let i = 0; i < slides.length; i++) {
  const slide = slides[i];
  const outPath = slide.imagePath || `pinterest_images/generated/image_${String(i + 1).padStart(3, "0")}.png`;
  const prompt = imagePrompt(slide, i);
  console.log(`Generating image ${i + 1}/${slides.length}: ${outPath}`);
  const url = await requestImage(prompt);
  await download(url, outPath);
  slide.imagePath = outPath;
  console.log(`Saved ${outPath}`);
}

writeFileSync(configPath, JSON.stringify(plan, null, 2));
console.log(`Updated ${configPath}`);

