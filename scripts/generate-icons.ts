/**
 * Generates the PWA and home-screen icons in public/icons from the NTS logo.
 * Run: npm run icons   (re-run whenever the logo changes, then commit the PNGs)
 *
 * The full logo is a wide wordmark that is unreadable at icon sizes, so the
 * bold "NTS" mark is cropped from the top of it and centred on a white square.
 * sharp is a dev dependency only; the generated files are what ships.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = path.resolve(__dirname, "..");
const SOURCE = path.join(root, "public/brand/nts-logo.png");
const OUT_DIR = path.join(root, "public/icons");
const BACKGROUND = "#FFFFFF";

// Top band of nts-logo.png that contains only the "NTS" letters.
const MARK_REGION = { left: 0, top: 0, width: 457, height: 100 };

const ICONS = [
  { file: "icon-192.png", size: 192, padding: 0.12 },
  { file: "icon-512.png", size: 512, padding: 0.12 },
  // Maskable icons are cropped to a circle or squircle; keep the mark inside
  // the central 80% safe zone, plus a little margin.
  { file: "icon-maskable-512.png", size: 512, padding: 0.24 },
  { file: "apple-touch-icon.png", size: 180, padding: 0.14 },
];

async function main() {
  // Extract and trim must be separate pipelines, or sharp trims first.
  const band = await sharp(SOURCE).extract(MARK_REGION).toBuffer();
  const mark = await sharp(band)
    .trim({ background: BACKGROUND, threshold: 20 })
    .toBuffer();

  await mkdir(OUT_DIR, { recursive: true });

  for (const { file, size, padding } of ICONS) {
    const inner = Math.round(size * (1 - padding * 2));
    const resized = await sharp(mark)
      .resize(inner, inner, { fit: "contain", background: BACKGROUND })
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: BACKGROUND },
    })
      .composite([{ input: resized, gravity: "center" }])
      .flatten({ background: BACKGROUND }) // iOS renders transparency as black
      .png()
      .toFile(path.join(OUT_DIR, file));

    console.log(`✓ icons/${file} (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
