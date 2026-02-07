import { readFileSync, writeFileSync } from 'fs';
import { PNG } from 'pngjs';

// Run: npm install pngjs && node scripts/remove-bg.mjs

const files = ['public/images/diamond1.png', 'public/images/diamond2.png'];
const THRESHOLD = 240; // pixels whiter than this become transparent

files.forEach((file) => {
  const png = PNG.sync.read(readFileSync(file));

  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];

    if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
      png.data[i + 3] = 0; // set alpha to 0 (transparent)
    }
  }

  writeFileSync(file, PNG.sync.write(png));
  console.log(`✅ Processed: ${file}`);
});