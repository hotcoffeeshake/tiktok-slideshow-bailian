import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, resolve } from "path";

const taskArg = process.argv[2] || "data/video-task.created.json";
const outputPath = process.argv[3] || "data/task-result.json";
const apiKey = process.env.DASHSCOPE_API_KEY;
const nativeBaseURL = (process.env.BAILIAN_NATIVE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");

if (!apiKey) {
  console.error("Missing DASHSCOPE_API_KEY. Copy .env.example to .env and set your Bailian API key.");
  process.exit(1);
}

function readTaskId(value) {
  if (existsSync(value)) {
    const json = JSON.parse(readFileSync(value, "utf8"));
    return json.task_id || json.output?.task_id || json.id;
  }
  return value;
}

function collectMediaUrls(value, urls = []) {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value) && (/\.(mp4|mov|webm|png|jpe?g)(\?|$)/i.test(value) || value.includes("oss"))) {
      urls.push(value);
    }
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaUrls(item, urls);
    return urls;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectMediaUrls(item, urls);
  }
  return urls;
}

async function download(url, folder = "output/video") {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  mkdirSync(folder, { recursive: true });
  const cleanName = basename(new URL(url).pathname) || "result.mp4";
  const filePath = `${folder}/${cleanName}`;
  writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
}

const taskId = readTaskId(taskArg);
if (!taskId) {
  console.error("Pass a task id or a JSON file containing task_id.");
  process.exit(1);
}

const response = await fetch(`${nativeBaseURL}/tasks/${taskId}`, {
  headers: { "Authorization": `Bearer ${apiKey}` }
});

const json = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(JSON.stringify(json, null, 2));
  throw new Error(`Task polling failed: ${response.status}`);
}

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, JSON.stringify(json, null, 2));
console.log(`Wrote ${outputPath}`);

const status = json.output?.task_status || json.task_status || json.status;
console.log(`Status: ${status || "unknown"}`);

if (status === "SUCCEEDED") {
  const urls = collectMediaUrls(json);
  if (urls.length === 0) {
    console.log("No downloadable media URL found.");
  } else {
    for (const url of urls) {
      const filePath = await download(url);
      console.log(`Downloaded ${filePath}`);
    }
  }
}

