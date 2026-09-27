import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const folder = new URL("./generated/earth-london-revised/", import.meta.url);
const prompt = `Edit the supplied ten-second video with ONLY the following two changes. Preserve its duration, widescreen composition, realistic Earth, warm lighting, colour grade, cinematic motion, London street architecture, busy walking crowd, microphone foam shape and white TTTN branding, and the same general sequence and pacing. Do not redesign the scene or introduce new subjects.

CHANGE 1: Correct the geographic zoom trajectory. As the camera approaches the United Kingdom, aim at the actual location of central London in SOUTHEAST ENGLAND, approximately latitude 51.5074 degrees north, longitude 0.1278 degrees west. From the overhead UK view, the camera must converge on the London urban area inland along the River Thames, west of the Thames estuary, north of the English Channel. Do not zoom into Wales, western England, the Midlands, northern England, Scotland or the Irish Sea. Preserve accurate Great Britain coastlines. Follow a geographically coherent descent into London's built-up area before the existing cloud transition and London street arrival. No map pins, labels, text overlays or drawn lines.

CHANGE 2: In EVERY frame of the final street scene, remove the foreground interviewer's entire hand, fingers, wrist, forearm and arm. Reconstruct the street background naturally where the arm was. Move the existing TTTN microphone from the right foreground to the exact horizontal centre of the frame. Its black foam head and white TTTN lettering remain clearly visible facing the camera; its dark handle extends vertically down through the BOTTOM CENTRE edge. The holder is entirely BELOW the camera crop and never visible. Do not show any skin or sleeve attached to the microphone. Do not create a detached floating hand or visible stand. Centre the microphone consistently throughout the final shot, with only minimal natural movement. Retain the surrounding crowd walking behind it. No person stops to answer questions. No interviewer or interviewee appears in the foreground.

Everything else should stay as close to the source video as possible. Ten seconds, no speech, no music, no audio, no new graphics.`;

async function main() {
  loadEnv({ path: fileURLToPath(new URL(".env.local", import.meta.url)), quiet: true });
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials || !/^[^\s:]+:[^\s:]+$/.test(credentials)) throw new Error();
  mkdirSync(folder, { recursive: true });
  const marker = new URL("attempt.json", folder);
  if (existsSync(marker)) { console.error("Edit attempt already recorded. No new request submitted."); process.exitCode = 1; return; }
  const source = JSON.parse(readFileSync(new URL("./generated/earth-london/result.json", import.meta.url), "utf8"));
  if (source.status !== "completed" || !source.video?.url) throw new Error();
  const model = "bytedance/seedance-2.5/video-edit";
  const input = { prompt, video_url: source.video.url, resolution: "720p", output_format: "mp4", generate_audio: false };
  writeFileSync(new URL("prompt.txt", folder), prompt);
  writeFileSync(marker, JSON.stringify({ startedAt: new Date().toISOString(), model, input }, null, 2), { flag: "wx" });
  config({ credentials, maxRetries: 0, maxPollTime: 900000 });
  const result = await higgsfield.subscribe(model, { input, withPolling: true });
  writeFileSync(new URL("result.json", folder), JSON.stringify({ status: result.status, request_id: result.request_id, video: result.status === "completed" ? result.video : undefined }, null, 2));
  if (result.status !== "completed" || !result.video?.url || !/^https:\/\//.test(result.video.url)) {
    console.error("No verified completed video. No retry submitted."); process.exitCode = 1; return;
  }
  console.log(result.video.url);
}
main().catch((error: unknown) => {
  console.error("Edit could not be verified. No automatic retry.");
  const status = (error as { statusCode?: unknown })?.statusCode;
  if (typeof status === "number") console.error(`HTTP status: ${status}`);
  process.exitCode = 1;
});
