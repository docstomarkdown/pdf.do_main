import type { ImagePage } from "./engines";

/** A picture's size in pixels, by decoding it. Rejects when the browser cannot show the file as an image. */
export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("no size");
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The EXIF orientation of a JPEG (1 is upright; 2 to 8 are turned or mirrored), read from its first bytes. */
export function jpegOrientation(bytes: Uint8Array): number {
  let i = 2; // past the start marker
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return 1;
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // The APP1 segment that begins "Exif" holds a small TIFF structure, with the orientation as tag 0x0112.
    if (marker === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78 && bytes[i + 6] === 0x69 && bytes[i + 7] === 0x66) {
      const t = i + 10;
      const little = bytes[t] === 0x49;
      const u16 = (o: number) => (little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
      const u32 = (o: number) => (little ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0 : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      if (ifd + 2 > bytes.length) return 1;
      const count = u16(ifd);
      for (let k = 0; k < count; k++) {
        const entry = ifd + 2 + k * 12;
        if (entry + 12 > bytes.length) return 1;
        if (u16(entry) === 0x0112) return u16(entry + 8);
      }
      return 1;
    }
    if (marker === 0xda) return 1; // the picture itself starts here: no more headers
    i += 2 + length;
  }
  return 1;
}

async function redraw(file: File, type: "image/png" | "image/jpeg"): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(file); // the browser applies the file's own orientation
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) throw new Error("This image could not be converted.");
    return await blob.arrayBuffer();
  } finally {
    bitmap.close();
  }
}

/**
 * A picture in the form the PDF engine takes. JPEG and PNG go in exactly as they are (a JPEG is never recompressed),
 * except a JPEG that is stored turned (a phone photo) and an interlaced PNG, which are redrawn upright. Every other
 * format (WebP, GIF, BMP) is redrawn as PNG, which keeps transparency.
 */
export async function toPdfImage(file: File): Promise<ImagePage> {
  const head = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (isJpeg && jpegOrientation(head) === 1) return { buffer: await file.arrayBuffer(), kind: "jpeg" };
  if (isPng && head[28] !== 1) return { buffer: await file.arrayBuffer(), kind: "png" };
  return isJpeg ? { buffer: await redraw(file, "image/jpeg"), kind: "jpeg" } : { buffer: await redraw(file, "image/png"), kind: "png" };
}
