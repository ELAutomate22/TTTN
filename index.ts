import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";
import { fileURLToPath } from "node:url";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";

async function main(): Promise<void> {
  loadEnv({ path: fileURLToPath(new URL(".env.local", import.meta.url)), quiet: true });
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials || credentials === "your-key-id:your-key-secret" || !/^[^\s:]+:[^\s:]+$/.test(credentials)) {
    console.error("Enter your key-id:key-secret locally in .env.local under HF_CREDENTIALS, then run npm start.");
    process.exitCode = 1;
    return;
  }

  const outputDir = new URL("./generated/", import.meta.url);
  mkdirSync(outputDir, { recursive: true });
  const marker = new URL("hero-attempt.json", outputDir);
  if (existsSync(marker)) {
    console.error("A hero generation attempt is already recorded. Check its status before authorizing another paid request.");
    process.exitCode = 1;
    return;
  }
  const prompt = readFileSync(new URL("hero-prompt.txt", import.meta.url), "utf8").trim();
  writeFileSync(marker, JSON.stringify({ startedAt: new Date().toISOString(), model: "bytedance/seedance-2.5/text-to-video", duration: 8, resolution: "720p", aspect_ratio: "16:9", generate_audio: false }, null, 2), { flag: "wx" });
  config({ credentials, maxRetries: 0 });
  const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
    input: {
      prompt,
      duration: 8,
      resolution: "720p",
      aspect_ratio: "16:9",
      output_format: "mp4",
      generate_audio: false,
    },
    withPolling: true,
  });
  writeFileSync(new URL("hero-result.json", outputDir), JSON.stringify({ status: result.status, request_id: result.request_id, video: result.status === "completed" ? result.video : undefined }, null, 2));

  if (result.status !== "completed") {
    // Only print known status labels, never raw SDK responses or errors.
    const status: string = result.status;
    const label = status === "nsfw" ? "moderated" : ["failed", "canceled", "cancelled", "moderated"].includes(status) ? status : "not completed";
    console.error(`Generation ${label}; no successful video was returned.`);
    process.exitCode = 1;
    return;
  }
  const url = result.video?.url;
  if (!url || !["https:", "http:"].includes(new URL(url).protocol)) {
    console.error("Completed response did not contain a valid video URL.");
    process.exitCode = 1;
    return;
  }
  console.log(url);
}

main().catch(() => {
  // SDK errors can include request details. Do not log them or credentials.
  console.error("Generation could not be verified. Check authentication, billing, and request status in the Higgsfield console before retrying.");
  process.exitCode = 1;
});
