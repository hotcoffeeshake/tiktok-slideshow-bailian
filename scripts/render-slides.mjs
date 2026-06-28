import { createCanvas, loadImage } from "@napi-rs/canvas";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";

const configPath = process.argv[2] || "data/slides-config.json";
const outputDir = process.argv[3] || "output";
const CANVAS_W = 1080;
const CANVAS_H = 1920;
const PADDING = 80;
const MAX_TEXT_W = CANVAS_W - PADDING * 2;

if (!existsSync(configPath)) {
  console.error(`Missing ${configPath}. Run: npm run plan -- data/input.example.json`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(configPath, "utf8"));
const slides = Array.isArray(plan) ? plan : plan.slides;

if (!Array.isArray(slides) || slides.length === 0) {
  console.error("slides-config must be an array or an object with a slides array.");
  process.exit(1);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawFallbackBackground(ctx, index) {
  const palettes = [
    ["#111827", "#f97316"],
    ["#0f172a", "#22c55e"],
    ["#18181b", "#38bdf8"],
    ["#1f2937", "#eab308"],
    ["#171717", "#f43f5e"],
    ["#0a0a0a", "#a3e635"]
  ];
  const [base, accent] = palettes[index % palettes.length];
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, CANVAS_H * 0.72, CANVAS_W, CANVAS_H * 0.28);
  ctx.globalAlpha = 1;
}

async function drawBackground(ctx, imagePath, index) {
  if (!imagePath || !existsSync(imagePath)) {
    drawFallbackBackground(ctx, index);
    return;
  }

  const img = await loadImage(imagePath);
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  ctx.drawImage(img, (CANVAS_W - drawW) / 2, (CANVAS_H - drawH) / 2, drawW, drawH);
}

async function renderSlide(slide, index) {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");

  await drawBackground(ctx, slide.imagePath, index);

  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  for (const line of slide.lines || []) {
    const size = Number(line.size || 72);
    const weight = line.weight || "bold";
    const y = Number(line.y || 900);
    ctx.font = `${weight} ${size}px sans-serif`;
    ctx.fillStyle = line.color || "#ffffff";

    const wrapped = wrapText(ctx, line.text || "", MAX_TEXT_W);
    const lineHeight = size * 1.18;
    const startY = y - ((wrapped.length - 1) * lineHeight) / 2;
    wrapped.forEach((text, offset) => {
      ctx.fillText(text, CANVAS_W / 2, startY + offset * lineHeight);
    });
  }

  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, `slide_${String(index + 1).padStart(2, "0")}.png`);
  writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`Rendered ${outPath}${slide.imagePath && !existsSync(slide.imagePath) ? ` (fallback background for ${basename(slide.imagePath)})` : ""}`);
}

for (let i = 0; i < slides.length; i++) {
  await renderSlide(slides[i], i);
}

