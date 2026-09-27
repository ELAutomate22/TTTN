import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

async function main() {
  const settings = JSON.parse(readFileSync(new URL("seedance-2.config.json", import.meta.url), "utf8"));
  if (settings.model !== "bytedance/seedance-2.0/text-to-video" ||
      !Number.isInteger(settings.duration) || settings.duration < 4 || settings.duration > 15 ||
      !["480p", "720p", "1080p", "4k"].includes(settings.resolution) ||
      !["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"].includes(settings.aspect_ratio) ||
      typeof settings.generate_audio !== "boolean" || settings.promptFile !== "seedance-2-prompt.txt") {
    throw new Error("Invalid configuration");
  }
  const prompt = readFileSync(new URL(settings.promptFile, import.meta.url), "utf8").trim();
  if (!prompt) throw new Error("Empty prompt");
  const input = { prompt, duration: settings.duration, resolution: settings.resolution, aspect_ratio: settings.aspect_ratio, generate_audio: settings.generate_audio };
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === "--generate")) throw new Error("Unknown argument");
  if (!args.includes("--generate")) {
    console.log(JSON.stringify({ mode: "preview — no API request", model: settings.model, input }, null, 2));
    return;
  }
  loadEnv({ path: fileURLToPath(new URL(".env.local", import.meta.url)), quiet: true });
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials || !/^[^\s:]+:[^\s:]+$/.test(credentials) || credentials.includes("your-key")) {
    console.error("Configure HF_CREDENTIALS locally in .env.local."); process.exitCode = 1; return;
  }
  const folder = new URL("./generated/seedance-2-retry-1/", import.meta.url);
  mkdirSync(folder, { recursive: true });
  const marker = new URL("attempt.json", folder);
  if (existsSync(marker)) { console.error("An attempt is already recorded. Review its status before authorizing another paid request."); process.exitCode = 1; return; }
  writeFileSync(marker, JSON.stringify({ startedAt: new Date().toISOString(), model: settings.model, input }, null, 2), { flag: "wx" });
  config({ credentials, maxRetries: 0, maxPollTime: 900000 });
  const result = await higgsfield.subscribe(settings.model, { input, withPolling: true });
  writeFileSync(new URL("result.json", folder), JSON.stringify({ status: result.status, request_id: result.request_id, video: result.status === "completed" ? result.video : undefined }, null, 2));
  if (result.status !== "completed" || !result.video?.url || new URL(result.video.url).protocol !== "https:") {
    console.error("No verified completed video: request failed, was moderated/canceled, or returned an invalid result."); process.exitCode = 1; return;
  }
  console.log(result.video.url);
}
main().catch(() => {
  console.error("Setup or generation could not be verified. No automatic retry. Check configuration and any recorded request before generating again.");
  process.exitCode = 1;
});
