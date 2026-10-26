/**
 * Client-side image compression using Canvas API.
 * Reduces file size before upload by resizing and re-encoding.
 */

interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.8;
const SKIP_THRESHOLD = 200 * 1024; // Skip compression for files < 200KB

/**
 * Compress an image file using Canvas API.
 * - Skips SVGs (vector, no benefit from raster compression)
 * - Skips files already under 200KB
 * - Preserves PNG format for PNGs, converts others to JPEG
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = options;

  // Skip SVGs — they're vector and shouldn't be rasterized
  if (file.type === 'image/svg+xml') return file;

  // iPhone HEIC/HEIF must ALWAYS be rasterized to a web-renderable JPEG — even
  // when small or already small-dimensioned — otherwise a stored .heic won't
  // display in browsers. So the "skip" fast-paths below don't apply to HEIC.
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

  // Skip already-small files (non-HEIC only)
  if (!isHeic && file.size <= SKIP_THRESHOLD) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    if (isHeic) {
      // Browsers other than Safari can't decode HEIC on canvas.
      throw new Error(
        'This photo is in HEIC format and could not be processed in your browser. On iPhone, set Camera → Formats → "Most Compatible", or upload a JPEG/PNG.',
      );
    }
    throw err;
  }
  const { width, height } = bitmap;

  // Skip if already within target dimensions (non-HEIC only — HEIC still needs
  // the JPEG re-encode below)
  if (!isHeic && width <= maxDimension && height <= maxDimension && file.size <= SKIP_THRESHOLD * 5) {
    bitmap.close();
    return file;
  }

  // Calculate scaled dimensions
  const scale = Math.min(maxDimension / width, maxDimension / height, 1);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Determine output format — keep PNG for PNGs (transparency), JPEG for everything else
  const isPng = file.type === 'image/png';
  const outputType = isPng ? 'image/png' : 'image/jpeg';

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas compression failed'))),
      outputType,
      isPng ? undefined : quality,
    );
  });

  // If compression actually made it larger, return the original — except for
  // HEIC, where the original won't render in a browser, so we keep the JPEG
  // even if it's larger.
  if (!isHeic && blob.size >= file.size) return file;

  // Build a new File with the same name but compressed content
  const ext = isPng ? '.png' : '.jpg';
  const name = file.name.replace(/\.[^.]+$/, ext);
  return new File([blob], name, { type: outputType });
}
