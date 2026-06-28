import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { spawnSync } from "child_process";

const inputPath = process.argv[2] || "data/motion-reference.example.json";
const spec = JSON.parse(readFileSync(inputPath, "utf8"));

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

function requireFile(path, label) {
  if (!path || !existsSync(path)) {
    console.error(`Missing ${label}: ${path || "(empty)"}`);
    process.exit(1);
  }
}

requireFile(spec.inputVideo, "inputVideo");

const outputVideo = spec.outputVideo || "output/reference/reference_motion.mp4";
const contactSheet = spec.contactSheet || "output/reference/reference_motion_contact.jpg";
const firstFrame = spec.firstFrame || "output/reference/reference_motion_first.jpg";
const fps = String(spec.contactSheetFps || 1);
const tile = spec.contactSheetTile || "5x3";
const scale = spec.contactSheetScale || "180:-1";
const trimStart = spec.trimStart ?? 0;
const duration = spec.duration;

mkdirSync(dirname(resolve(outputVideo)), { recursive: true });
mkdirSync(dirname(resolve(contactSheet)), { recursive: true });
mkdirSync(dirname(resolve(firstFrame)), { recursive: true });

const trimArgs = ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(trimStart), "-i", spec.inputVideo];
if (duration !== undefined) trimArgs.push("-t", String(duration));
trimArgs.push("-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", outputVideo);
run("ffmpeg", trimArgs);

run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  outputVideo,
  "-vf",
  `fps=${fps},scale=${scale},tile=${tile}`,
  "-frames:v",
  "1",
  contactSheet
]);

run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-ss",
  "0",
  "-i",
  outputVideo,
  "-frames:v",
  "1",
  firstFrame
]);

run("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "format=duration,size:stream=width,height,codec_name,r_frame_rate",
  "-of",
  "json",
  outputVideo
]);

console.log(`Prepared motion reference: ${outputVideo}`);
console.log(`Contact sheet: ${contactSheet}`);
console.log(`First frame: ${firstFrame}`);
