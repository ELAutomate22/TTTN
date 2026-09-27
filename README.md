# Talk to the Nation website

Run `npm install` once, then `npm run dev` to start the website at the printed local address. `npm run build` checks TypeScript and creates the static site in `dist/`. `npm run preview` serves that build for review.

For a local preview that runs independently of the assistant's terminal session, run `npm run build` then `npm run preview:stable` on Windows. It starts a hidden production-preview process on port 5173, with logs and PID under `.preview/`. Rebuild after edits; refresh the page to load the new build. It remains a local process and needs restarting after a computer restart; permanent public availability requires hosting. The hero retains a poster during media failures, retries failed loads with a limit, and restores scroll position after page/tab resume.

The full-film player uses the **revised Seedance 2.5 Earth-to-London 1080p delivery** in `public/media/tttn-earth-london-original.mp4`, copied byte-for-byte. The scroll view uses `tttn-earth-london-seek.mp4`, a full-resolution 1080p, all-intra H.264 copy (CRF 12, SSIM 0.995593 versus the delivery) so every frame can be decoded independently. Seeking is serialized and eased toward the latest scroll position to avoid cancelling unfinished decodes. Scrolling down moves forward through the video; scrolling up rewinds it. The source 720p and delivered upscaled 1080p files remain in `generated/earth-london-revised/`. The Seedance 2.0 generation is not used by the site.

The website includes a filtered and searchable set of verified public TTTN links, a five-question quiz with optional timer and score sharing, location selector, about and business sections, media-kit request, participation and partnership email drafts, mobile navigation, reduced-motion still image, and a privacy page. Curated links, questions and locations live in `src/content.ts`; layout and behavior live in `src/main.tsx` and `src/styles.css`.

Contact forms open the visitor's own email application; they do not silently send or store enquiries. A live server-side form, approved campaign case studies, and a downloadable media kit require their respective production services and approved content. This build uses no analytics or browser-side API keys. The existing Higgsfield credentials remain in the ignored `.env.local` file and are never bundled into the site.

Use `node scripts/verify-site.mjs` with the dev server running to check desktop/mobile rendering and the main interactions. The script writes review screenshots to `research/`.

## Higgsfield generation scripts

## Seedance 2.0 (native 1080p)

Configured separately in `seedance-2.config.json`, with the scene in `seedance-2-prompt.txt`. Defaults: 10 seconds, native 1080p, 16:9, no audio. Supports 480p, 720p, 1080p and 4k; duration 4–15 seconds per the supplied model reference.

- `npm run seedance2:preview`: validate and preview the request without loading credentials or making an API request.
- `npm run seedance2:generate`: submit one **billable** request using the existing server-side `.env.local` credentials and wait for completion.

Automatic submission retries are disabled. `generated/seedance-2/attempt.json` guards against repeat submission; inspect the provider's request status before authorizing another attempt. Successful results are recorded in `result.json`. This text-to-video endpoint does not accept the microphone image or edit the previous clip; its prompt describes the latest scene requirements. Native resolution does not guarantee geographically accurate generation. Setup checks do not verify model access or billing.

Reference: https://console.higgsfield.ai/models/bytedance/seedance-2.0/text-to-video

## Existing Seedance 2.5 workflow

Server-side TypeScript example using the official Higgsfield SDK.

1. In your local editor, open `.env.local` and replace the placeholder with your API key ID and secret in `key-id:key-secret` format. Never paste credentials into chat or commit this file.
2. Run `npm run typecheck`.
3. Run `npm run higgsfield:sample` only if you intend to submit that separate billable sample request. It is guarded against repeat submission and is unrelated to running the website.

The example uses `hero-prompt.txt` for the approved London microphone scene: 8 seconds, 720p, 16:9, MP4, with audio disabled. Submission retries are disabled. An attempt marker in `generated/hero-attempt.json` prevents accidental repeat billing; do not remove it without checking the previous request and authorizing another generation. A terminal response is recorded in `generated/hero-result.json`. Failed, canceled, moderated, invalid, or unverified responses exit with an error. Before retrying an interrupted request, check the console to avoid duplicate charges.

Credentials load at runtime from this directory's ignored `.env.local`. Run this script only with Node.js; do not bundle it into a browser application.

Official references:
- https://docs.higgsfield.ai/docs/how-to/sdk
- https://console.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference

