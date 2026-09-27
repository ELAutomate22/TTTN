import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const folder = new URL("./generated/earth-london/", import.meta.url);
async function main() {
  loadEnv({ path: fileURLToPath(new URL(".env.local", import.meta.url)), quiet: true });
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials || !/^[^\s:]+:[^\s:]+$/.test(credentials) || credentials.includes("your-key")) throw new Error();
  const marker = new URL("attempt.json", folder);
  if (existsSync(marker)) { console.error("Attempt already recorded. No new request submitted."); process.exitCode = 1; return; }
  const uploadResponse = await fetch("https://api.higgsfield.ai/files/generate-upload-url", { method: "POST", headers: { Authorization: `Key ${credentials}`, "Content-Type": "application/json" }, body: JSON.stringify({ content_type: "image/png" }) });
  if (!uploadResponse.ok) { console.error(`Upload URL request HTTP ${uploadResponse.status}`); return void (process.exitCode = 1); }
  const slot = await uploadResponse.json() as { upload_url: string; public_url: string; upload_headers?: Record<string, string> };
  const uploaded = await fetch(slot.upload_url, { method: "PUT", headers: slot.upload_headers ?? { "Content-Type": "image/png" }, body: new Uint8Array(readFileSync(new URL("microphone-reference.png", folder))) });
  if (!uploaded.ok) { console.error(`Storage upload HTTP ${uploaded.status}`); return void (process.exitCode = 1); }
  const imageUrl = slot.public_url;
  console.log("Microphone reference uploaded.");
  const model = "bytedance/seedance-2.5/reference-to-video";
  const input = { prompt: readFileSync(new URL("prompt.txt", folder), "utf8").trim(), image_urls: [imageUrl], duration: 10, resolution: "720p", aspect_ratio: "16:9", output_format: "mp4", generate_audio: false };
  writeFileSync(marker, JSON.stringify({ startedAt: new Date().toISOString(), model, input }, null, 2), { flag: "wx" });
  config({ credentials, maxRetries: 0, maxPollTime: 900000 });
  const result = await higgsfield.subscribe(model, { input, withPolling: true });
  writeFileSync(new URL("result.json", folder), JSON.stringify({ status: result.status, request_id: result.request_id, video: result.status === "completed" ? result.video : undefined }, null, 2));
  if (result.status !== "completed" || !result.video?.url || !/^https:\/\//.test(result.video.url)) {
    console.error("No verified completed video. No retry will be submitted."); process.exitCode = 1; return;
  }
  console.log(result.video.url);
}
main().catch((error: unknown) => {
  const status = (error as { statusCode?: unknown })?.statusCode;
  console.error("Upload or generation could not be verified. No automatic retry.");
  if (typeof status === "number") console.error(`HTTP status: ${status}`);
  process.exitCode = 1;
});
