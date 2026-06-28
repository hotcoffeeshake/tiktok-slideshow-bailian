import { existsSync, readFileSync } from "fs";
import { spawn } from "child_process";

const inputPath = process.argv[2] || "data/video-edit.example.json";
const spec = JSON.parse(readFileSync(inputPath, "utf8"));
const mode = spec.mode || "edit";
const parameters = spec.parameters || {};

function pushOptional(args, flag, value) {
  if (value === undefined || value === null || value === "") return;
  args.push(flag, String(value));
}

function pushBoolean(args, flag, value) {
  if (value === undefined || value === null) return;
  args.push(flag, value ? "true" : "false");
}

function requireFile(path, label) {
  if (!path || !existsSync(path)) {
    console.error(`Missing ${label}: ${path || "(empty)"}`);
    process.exit(1);
  }
}

const args = [];
if (spec.dryRun) args.push("--dry-run");
args.push("--output", "json", "video", mode);

pushOptional(args, "--model", spec.model);

if (mode === "edit") {
  requireFile(spec.video, "video");
  requireFile(spec.refImage, "refImage");
  pushOptional(args, "--video", spec.video);
  pushOptional(args, "--ref-image", spec.refImage);
} else if (mode === "ref") {
  requireFile(spec.image, "image");
  requireFile(spec.refVideo, "refVideo");
  pushOptional(args, "--image", spec.image);
  pushOptional(args, "--ref-video", spec.refVideo);
} else {
  console.error(`Unsupported mode: ${mode}. Use "edit" or "ref".`);
  process.exit(1);
}

pushOptional(args, "--prompt", spec.prompt);
pushOptional(args, "--negative-prompt", spec.negativePrompt);
pushOptional(args, "--resolution", parameters.resolution);
pushOptional(args, "--ratio", parameters.ratio);
pushOptional(args, "--duration", parameters.duration);
pushOptional(args, "--audio-setting", parameters.audioSetting);
pushBoolean(args, "--watermark", parameters.watermark);
pushOptional(args, "--download", spec.download);

console.log(`Running: bl ${args.map((item) => (/\s/.test(item) ? JSON.stringify(item) : item)).join(" ")}`);

const child = spawn("bl", args, { stdio: "inherit" });
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => {
  process.exit(code ?? 1);
});
