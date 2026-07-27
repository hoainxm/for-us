// Sinh icon PWA từ SVG (không cần file ảnh gốc). Chạy: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(outDir, { recursive: true });

const ROSE = "#e11d64";
const heart = (fill) =>
  `<path fill="${fill}" d="M256 448 C 256 448, 72 336, 72 204 C 72 136, 124 96, 178 96 C 218 96, 244 120, 256 146 C 268 120, 294 96, 334 96 C 388 96, 440 136, 440 204 C 440 336, 256 448, 256 448 Z"/>`;

// icon thường: nền bo góc + tim trắng
const rounded = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${ROSE}"/>
  ${heart("#ffffff")}
</svg>`;

// maskable: nền full-bleed, tim nhỏ hơn (nằm trong safe-zone)
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${ROSE}"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">${heart("#ffffff")}</g>
</svg>`;

const jobs = [
  { svg: rounded, size: 192, name: "pwa-192x192.png" },
  { svg: rounded, size: 512, name: "pwa-512x512.png" },
  { svg: maskable, size: 512, name: "maskable-512x512.png" },
  { svg: rounded, size: 180, name: "apple-touch-icon.png" },
  { svg: rounded, size: 64, name: "favicon.png" },
];

for (const j of jobs) {
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(join(outDir, j.name));
  console.log("✓", j.name);
}
console.log("Done icons ->", outDir);
