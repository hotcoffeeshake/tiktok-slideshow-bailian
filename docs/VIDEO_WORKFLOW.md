# 视频下载、动作参考和视频生成工作流

这套流程用于“参考视频动作 + 角色图替换主体”的视频生成。它来自实际跑通的一次工作流：先准备动作参考视频，再尝试专用动作迁移模型；如果参考视频不满足人体检测要求，就切到通用视频编辑模型完成主体替换。

## 1. 视频下载

做什么：

- 把外部参考视频下载到本地。
- 后续所有裁剪、抽帧和视频生成都从本地文件开始。

命令：

```bash
npm run video:download -- data/video-download.example.json
```

输出：

- `output/reference/reference_motion_raw.mp4`

说明：

- `video:download` 适合直接 mp4/mov/webm 链接。
- 如果平台链接需要登录、解析或反爬，可以先用你本机的视频下载工具下载，再把本地路径写入 `data/motion-reference.example.json`。

## 2. 动作参考准备

做什么：

- 用 `ffmpeg` 裁剪动作片段。
- 抽第一帧和 contact sheet，用来判断人物是否清晰、动作是否连续、开头是否正面。
- 用 `ffprobe` 输出视频尺寸、帧率、时长和大小。

命令：

```bash
npm run video:motion -- data/motion-reference.example.json
```

输出：

- `output/reference/reference_motion_9s.mp4`
- `output/reference/reference_motion_first.jpg`
- `output/reference/reference_motion_contact.jpg`

判断标准：

- 如果使用 `wan2.2-animate-mix`，参考视频最好是单人、人体清晰、正面或接近正面开头。
- 如果视频从背影、侧身、遮挡、多人或远景开始，动作迁移模型可能返回 `InvalidVideo.NoHuman` 或 `InvalidVideo.FrontBody`。
- 这种情况下优先改用 `wan2.7-videoedit`，让视频编辑模型保留动作、镜头和场景，再替换主体。

## 3. 动作参考生成

做什么：

- 使用 `bl video ref` 调用参考视频 + 参考图片的生成能力。
- 推荐先 dry-run 检查请求结构，再正式提交。

命令：

```bash
npm run video:ref -- data/video-ref.example.json
```

对应工具调用：

```bash
bl --output json video ref \
  --model wan2.2-animate-mix \
  --image assets/step-04/character_reference_three_view.png \
  --ref-video output/reference/reference_motion_9s.mp4 \
  --resolution 720P \
  --ratio 9:16 \
  --duration 9 \
  --watermark false \
  --download output/video/doll_motion_animate_mix.mp4
```

适用场景：

- 参考视频人体清晰。
- 目标是把参考动作迁移到角色图。
- 希望动作尽量贴近原视频。

## 4. 视频编辑生成

做什么：

- 使用 `bl video edit` 调用 `wan2.7-videoedit`。
- 输入参考视频和角色图，保留原视频动作、镜头、节奏、背景和音频，替换主角身份和服装。

命令：

```bash
npm run video:edit -- data/video-edit.example.json
```

对应工具调用：

```bash
bl --output json video edit \
  --model wan2.7-videoedit \
  --video output/reference/reference_motion_9s.mp4 \
  --ref-image assets/step-04/character_reference_three_view.png \
  --resolution 720P \
  --ratio 9:16 \
  --duration 9 \
  --audio-setting origin \
  --watermark false \
  --download output/video/doll_motion_wan27_videoedit.mp4
```

注意事项：

- `duration` 不要超过输入视频实际时长。实际案例里输入是 9.9 秒，设置 10 秒会失败，改成 9 秒后成功。
- 正向 prompt 要强调“保留原动作、节奏、镜头、速度、背景，只替换主体”。
- 负向 prompt 要压住静态姿势、动作变慢、主体错误、背景变化、文字、水印、低质等问题。

## 5. 视频下载与校验

做什么：

- `bl` CLI 带 `--download` 时会在生成成功后保存视频。
- 生成后用 `ffprobe` 检查参数，再抽 contact sheet 做肉眼检查。

命令：

```bash
npm run video:check -- data/video-check.example.json
```

输出：

- 视频参数 JSON
- `output/video/doll_motion_contact_sheet.jpg`

检查重点：

- 视频是否为 9:16。
- 主体是否替换成参考图角色。
- 动作是否连续，是否明显变成静态摆拍。
- 是否保留原视频镜头和节奏。
- 是否有额外人物、畸形肢体、文字、水印或背景大幅变化。

## 模型选择经验

- `doubao-seedance-1-0-lite-i2v-250428`：如果当前服务端返回 `Model not exist`，不要卡住，直接换可用模型。
- `wan2.2-animate-mix`：适合正面清晰单人动作迁移，对参考视频的人体检测要求更严格。
- `wan2.7-videoedit`：适合“参考视频动作 + 参考图换主角”的主体替换，容错更高，实际产出链路优先推荐。

## 工具映射

- 视频下载：`npm run video:download`
- 裁剪、抽帧、参数检查：`ffmpeg` / `ffprobe`，封装在 `npm run video:motion` 和 `npm run video:check`
- 动作迁移：`bl video ref --model wan2.2-animate-mix`
- 视频编辑/主体替换：`bl video edit --model wan2.7-videoedit`
- 百炼异步任务下载：已有 `npm run video:create` 和 `npm run video:poll`，适合直接 DashScope API 任务；`bl` CLI 路线使用 `--download` 自动保存结果。
