/**
 * generate-sticker-qr.mjs
 *
 * One-shot generator for the Ruby+ city-sticker QR code.
 *
 * Produces TWO files in `public/qr/`:
 *
 *   rubyplus-sticker.png  — 2000×2000 raster. Good for digital review,
 *                           presentations, and small-format print.
 *   rubyplus-sticker.svg  — vector. Preferred by professional printers
 *                           because it stays crisp at any sticker size
 *                           (from business-card to billboard).
 *
 * The encoded URL includes UTM parameters so visits from the printed
 * stickers can be attributed in analytics (GA / Plausible / Vercel
 * Analytics all parse these natively, no extra code needed on our side).
 *
 * Run:
 *   npm run qr:sticker
 *
 * Re-run any time the URL or branding changes — outputs overwrite.
 */
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';

// Encoded URL. The UTM params travel with the URL through the browser
// onto rubyplus.net so analytics can attribute the visit to the sticker
// campaign. Removing them later costs nothing; adding them after
// printing 10,000 stickers is impossible — bake them in now.
const URL_TO_ENCODE =
  'https://rubyplus.net/?utm_source=qr_sticker&utm_medium=offline&utm_campaign=review_drive';

// Brand colors. Ruby red on white is high-contrast and well within the
// reflectance ratio that consumer-phone QR scanners can read. Don't
// invert (red modules on darker background) — light dirt or moisture
// pushes that combination below the scanner's contrast threshold.
const FOREGROUND = '#FD362F'; // ruby-red
const BACKGROUND = '#FFFFFF';

const outDir = path.join(process.cwd(), 'public', 'qr');
fs.mkdirSync(outDir, { recursive: true });

const baseOptions = {
  // Margin in modules around the QR (the "quiet zone"). 4 is the QR
  // spec minimum — scanners need this white space to find the code
  // edges. Don't let the designer crop it.
  margin: 4,
  // Error-correction level H = ~30% redundancy. The QR still scans
  // even if 30% of it is damaged — rain, scratches, glue residue,
  // partial peel, sticker corner curling, etc. Higher level = denser
  // pattern but far more robust for outdoor street use.
  errorCorrectionLevel: 'H',
  color: {
    dark: FOREGROUND,
    light: BACKGROUND,
  },
};

const pngPath = path.join(outDir, 'rubyplus-sticker.png');
const svgPath = path.join(outDir, 'rubyplus-sticker.svg');

// 2000×2000 PNG — looks crisp from a sticker-sized 5cm print all the way
// up to a billboard. Smaller phones still render fine because the SVG
// is also available for vector-perfect scaling.
await QRCode.toFile(pngPath, URL_TO_ENCODE, {
  ...baseOptions,
  width: 2000,
});

await QRCode.toFile(svgPath, URL_TO_ENCODE, {
  ...baseOptions,
  type: 'svg',
});

console.log('');
console.log('✓ Ruby+ sticker QR generated');
console.log('');
console.log(`  PNG (2000×2000):  ${path.relative(process.cwd(), pngPath)}`);
console.log(`  SVG (vector):     ${path.relative(process.cwd(), svgPath)}`);
console.log('');
console.log(`  Encoded URL:`);
console.log(`    ${URL_TO_ENCODE}`);
console.log('');
console.log('  Hand the SVG to the sticker designer/printer.');
console.log('  Keep the surrounding white quiet zone — do NOT crop it.');
console.log('  Minimum recommended QR size on the sticker: 2.5cm × 2.5cm.');
console.log('');
