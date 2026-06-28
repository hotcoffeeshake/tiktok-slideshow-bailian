import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const inputPath = process.argv[2] || "data/video-task.example.json";
const outputPath = process.argv[3] || "data/video-task.created.json";
const apiKey = process.env.DASHSCOPE_API_KEY;
const nativeBaseURL = (process.env.BAILIAN_NATIVE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");

if (!apiKey) {
  console.error("Missing DASHSCOPE_API_KEY. Copy .env.example to .env and set your Bailian API key.");
  process.exit(1);
}

const spec = JSON.parse(readFileSync(inputPath, "utf8"));
const model = spec.model || process.env.BAILIAN_VIDEO_MODEL || "wan2.7-t2v";
const endpoint = spec.endpoint || `${nativeBaseURL}/services/aigc/video-generation/video-synthesis`;

const payload = {
  model,
  input: spec.input || { prompt: spec.prompt },
  parameters: {
    resolution: process.env.BAILIAN_VIDEO_RESOLUTION || "720P",
    ratio: process.env.BAILIAN_VIDEO_RATIO || "9:16",
    prompt_extend: true,
    watermark: false,
    duration: Number(process.env.BAILIAN_VIDEO_DURATION || 5),
    ...(spec.parameters || {})
  }
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-DashScope-Async": "enable"
  },
  body: JSON.stringify(payload)
});

const json = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(JSON.stringify(json, null, 2));
  throw new Error(`Video task creation failed: ${response.status}`);
}

const taskId = json.output?.task_id || json.task_id || json.id;
if (!taskId) {
  console.error(JSON.stringify(json, null, 2));
  throw new Error("No task_id found in response.");
}

const result = {
  task_id: taskId,
  endpoint,
  model,
  createdAt: new Date().toISOString(),
  request: payload,
  response: json
};

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Created task ${taskId}`);
console.log(`Wrote ${outputPath}`);

