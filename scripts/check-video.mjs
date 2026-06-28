import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { spawnSync } from "child_process";

const inputPath = process.argv[2] || "data/video-check.example.json";
const spec = JSON.parse(readFileSync(inputPath, "utf8"));

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

if (!spec.video || !existsSync(spec.video)) {
  console.error(`Missing video: ${spec.video || "(empty)"}`);
  process.exit(1);
}

const contactSheet = spec.contactSheet || "output/video/result_contact_sheet.jpg";
mkdirSync(dirname(resolve(contactSheet)), { recursive: true });

run("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "format=duration,size:stream=width,height,codec_name,r_frame_rate",
  "-of",
  "json",
  spec.video
]);

run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  spec.video,
  "-vf",
  `fps=${spec.fps || 1},scale=${spec.scale || "180:-1"},tile=${spec.tile || "5x2"}`,
  "-frames:v",
  "1",
  contactSheet
]);

console.log(`Contact sheet: ${contactSheet}`);
