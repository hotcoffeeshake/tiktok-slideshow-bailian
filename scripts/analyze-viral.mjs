import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import OpenAI from "openai";

const inputPath = process.argv[2] || "data/viral-references.example.json";
const analysisPath = process.argv[3] || "data/viral-analysis.json";
const briefPath = process.argv[4] || "data/input.generated.json";

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.BAILIAN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const model = process.env.BAILIAN_MODEL || "qwen-plus";

if (!apiKey) {
  console.error("Missing DASHSCOPE_API_KEY. Copy .env.example to .env and set your Bailian API key.");
  process.exit(1);
}

const source = JSON.parse(readFileSync(inputPath, "utf8"));
const client = new OpenAI({ apiKey, baseURL });

const outputShape = {
  styleRead: "one-paragraph observable style summary",
  hookPatterns: ["repeatable hook pattern"],
  structurePatterns: ["repeatable slide structure pattern"],
  visualPatterns: ["repeatable visual pattern"],
  shouldEmulate: ["safe pattern to reuse"],
  shouldAvoid: ["thing to avoid copying or overusing"],
  sourceSlideshowNotes: ["brief observation suitable for data/input.json"],
  generatedBrief: {
    niche: "string",
    language: "string",
    audience: "string",
    desiredSlideCount: 6,
    sourceSlideshowNotes: ["string"],
    goal: "string"
  }
};

const completion = await client.chat.completions.create({
  model,
  messages: [
    {
      role: "system",
      content:
        "You analyze viral TikTok slideshow references. Separate observable facts from interpretation. Reuse structures and patterns, never copy distinctive wording. Return strict JSON only."
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Analyze these viral slideshow references and produce reusable guidance plus a generated brief that can feed the slideshow planner.",
        source,
        outputShape
      })
    }
  ],
  temperature: 0.4,
  response_format: { type: "json_object" }
});

const raw = completion.choices?.[0]?.message?.content || "{}";
let analysis;

try {
  analysis = JSON.parse(raw);
} catch (error) {
  console.error("Bailian returned non-JSON content:");
  console.error(raw);
  process.exit(1);
}

mkdirSync(dirname(resolve(analysisPath)), { recursive: true });
writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
console.log(`Wrote ${analysisPath}`);

if (analysis.generatedBrief) {
  mkdirSync(dirname(resolve(briefPath)), { recursive: true });
  writeFileSync(briefPath, JSON.stringify(analysis.generatedBrief, null, 2));
  console.log(`Wrote ${briefPath}`);
}

