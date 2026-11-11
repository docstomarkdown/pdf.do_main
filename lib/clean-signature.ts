/**
 * Takes the paper out of a photo or scan of a signature. Pixels about as light as the paper become see-through and the
 * ink keeps its own colour, so the signature sits on a page without a pale box around it.
 *
 * How it decides: the paper is taken to be the light end of the picture (the brightness that 9 pixels in 10 fall below).
 * A pixel is ink when it is clearly darker than that. `strength` (0 to 100) sets how much darker it has to be: a higher
 * number removes more, shadows and faint pencil included. Edges fade over a short range so the ink is not jagged.
 *
 * Runs on a canvas in this tab; nothing is sent anywhere. Large pictures are scaled down to 1600 px on the long side.
 * Returns the cleaned picture as a PNG trimmed to its ink, or null when the picture cannot be opened here or nothing
 * darker than the paper is left.
 */

const LONGEST = 1600;
const FADE = 36; // brightness steps over which a pixel goes from see-through to solid

/** How far below the paper's brightness a pixel must be before any of it is kept, for a strength of 0 to 100. */
export const cutFor = (strength: number) => 10 + Math.min(100, Math.max(0, strength)) * 0.9;

/** The cleaning itself, on raw pixels (RGBA, four bytes each). Changes `data` in place and returns the ink's box, or null. */
export function cleanPixels(data: Uint8ClampedArray, width: number, height: number, strength: number): { left: number; top: number; right: number; bottom: number } | null {
  const count = width * height;
  const light = new Uint8Array(count);
  const histogram = new Uint32Array(256);
  let seen = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    const l = Math.round(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]);
    light[i] = l;
    if (data[o + 3] > 8) { histogram[l]++; seen++; }
  }
  if (seen === 0) return null;
  // The paper: the brightness that nine in ten of the visible pixels fall at or below.
  let paper = 255;
  for (let l = 0, below = 0; l < 256; l++) { below += histogram[l]; if (below >= seen * 0.9) { paper = l; break; } }
  const cut = cutFor(strength);
  let left = width, right = -1, top = height, bottom = -1;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    const darker = paper - light[i];
    const keep = Math.min(1, Math.max(0, (darker - cut) / FADE));
    const alpha = Math.round(data[o + 3] * keep);
    data[o + 3] = alpha;
    if (alpha > 8) {
      const x = i % width, y = (i - x) / width;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

export async function removePaper(file: File, strength: number): Promise<File | null> {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { return null; }
  try {
    const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    const box = cleanPixels(image.data, width, height, strength);
    if (!box) return null;
    ctx.putImageData(image, 0, 0);
    const pad = 4;
    const out = document.createElement("canvas");
    out.width = box.right - box.left + 1 + pad * 2;
    out.height = box.bottom - box.top + 1 + pad * 2;
    out.getContext("2d")!.drawImage(canvas, box.left, box.top, box.right - box.left + 1, box.bottom - box.top + 1, pad, pad, box.right - box.left + 1, box.bottom - box.top + 1);
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
    return blob ? new File([blob], "signature.png", { type: "image/png" }) : null;
  } finally {
    bitmap.close();
  }
}
