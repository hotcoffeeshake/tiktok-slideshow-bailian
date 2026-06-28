import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import OpenAI from "openai";

const inputPath = process.argv[2] || "data/input.example.json";
const outputPath = process.argv[3] || "data/slides-config.json";

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.BAILIAN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const model = process.env.BAILIAN_MODEL || "qwen-plus";

if (!apiKey) {
  console.error("Missing DASHSCOPE_API_KEY. Copy .env.example to .env and set your Bailian API key.");
  process.exit(1);
}

const brief = JSON.parse(readFileSync(inputPath, "utf8"));
const slideCount = Number(brief.desiredSlideCount || 6);

const client = new OpenAI({ apiKey, baseURL });

const schemaInstruction = {
  niche: "string",
  pinterestQueries: ["2-4 word image search phrase"],
  caption: "string",
  slides: [
    {
      imagePath: "./pinterest_images/<niche>/image_001.jpg",
      lines: [
        { text: "short overlay line", size: 88, weight: "bold", y: 820 }
      ]
    }
  ]
};

const completion = await client.chat.completions.create({
  model,
  messages: [
    {
      role: "system",
      content:
        "You create TikTok slideshow plans. Return strict JSON only. Keep overlay text short, concrete, and readable on mobile. Do not include markdown."
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Generate a TikTok slideshow plan from this brief. Produce exactly the requested slide count. Use 1080x1920 centered text coordinates. The imagePath values should point to local placeholder files under ./pinterest_images/<niche>/image_001.jpg and increment per slide.",
        brief,
        outputShape: schemaInstruction,
        slideCount
      })
    }
  ],
  temperature: 0.7,
  response_format: { type: "json_object" }
});

const raw = completion.choices?.[0]?.message?.content || "{}";
let parsed;

try {
  parsed = JSON.parse(raw);
} catch (error) {
  console.error("Bailian returned non-JSON content:");
  console.error(raw);
  process.exit(1);
}

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
console.log(`Wrote ${outputPath}`);
if (parsed.pinterestQueries) {
  console.log("Pinterest queries:");
  for (const query of parsed.pinterestQueries) console.log(`- ${query}`);
}

