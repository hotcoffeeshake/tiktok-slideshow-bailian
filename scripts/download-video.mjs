import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, resolve } from "path";

const inputPath = process.argv[2] || "data/video-download.example.json";

function readSpec(path) {
  if (/^https?:\/\//.test(path)) {
    return { url: path };
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function inferOutputPath(url, outputPath) {
  if (outputPath) return outputPath;
  const name = basename(new URL(url).pathname) || "reference-video.mp4";
  return `output/reference/${name}`;
}

const spec = readSpec(inputPath);
if (!spec.url) {
  console.error("Missing url. Pass a direct video URL or a JSON file with { \"url\": \"...\" }.");
  process.exit(1);
}

const outputPath = inferOutputPath(spec.url, spec.outputPath);
const response = await fetch(spec.url, {
  headers: spec.headers || {}
});

if (!response.ok) {
  throw new Error(`Video download failed: ${response.status} ${spec.url}`);
}

mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
console.log(`Downloaded ${outputPath}`);
