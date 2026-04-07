/**
 * One-off script: make favicon round and background transparent (or white).
 * Run: node scripts/process-favicon.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const inputPath = path.join(publicDir, 'favicon.png');
const outputPath = path.join(publicDir, 'favicon.png');
const outputPathIco = path.join(publicDir, 'favicon.ico');

const SIZE = 512; // output size (square)
const BLACK_THRESHOLD = 40; // pixels darker than this become transparent

async function main() {
  const image = sharp(inputPath);

  // 1) Resize to square (cover = crop to fill)
  const raw = await image
    .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = raw;
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // 2) Circular mask: center (cx, cy), radius
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  const outData = Buffer.alloc(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= radius * radius;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels === 4 ? data[i + 3] : 255;

      // Luminance (0–255); dark = background
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
      const isBackground = lum <= BLACK_THRESHOLD;

      let outAlpha = inCircle ? a : 0;
      if (inCircle && isBackground) outAlpha = 0; // transparent background

      outData[i] = r;
      outData[i + 1] = g;
      outData[i + 2] = b;
      outData[i + 3] = outAlpha;
    }
  }

  const result = sharp(outData, {
    raw: { width, height, channels: 4 },
  });

  await result.png().toFile(outputPath);
  console.log('Written:', outputPath);

  // Also write a small 32x32 for .ico-like use and copy as favicon.ico (PNG content)
  const small = await sharp(outData, {
    raw: { width, height, channels: 4 },
  })
    .resize(32, 32)
    .png()
    .toBuffer();
  writeFileSync(outputPathIco, small);
  console.log('Written:', outputPathIco);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
