import sharp from "sharp";
import { storage } from "../storage";

export interface ProcessedImage {
  originalUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

const VARIANTS = {
  thumbnail: 320,
  medium: 1024,
  large: 2048,
} as const;

const ALLOWED_SIGNATURES: Array<{ mime: string; check: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    check: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    check: (b) =>
      b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP",
  },
];

export function detectImageMime(buffer: Buffer): string | null {
  for (const sig of ALLOWED_SIGNATURES) {
    if (sig.check(buffer)) return sig.mime;
  }
  return null;
}

/**
 * Generates thumbnail/medium/large WebP variants plus the stored original,
 * uploading each through the configured StorageAdapter. Keeps the original
 * bytes untouched so nothing is lost to lossy re-encoding.
 */
export async function processImage(
  buffer: Buffer,
  keyPrefix: string,
  originalFilename: string
): Promise<ProcessedImage> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const ext = originalFilename.split(".").pop() || "jpg";
  const originalUrl = await storage.put(
    `${keyPrefix}/original.${ext}`,
    buffer,
    meta.format ? `image/${meta.format}` : "application/octet-stream"
  );

  const variantUrls: Record<keyof typeof VARIANTS, string> = {
    thumbnail: "",
    medium: "",
    large: "",
  };

  for (const [name, targetWidth] of Object.entries(VARIANTS) as [
    keyof typeof VARIANTS,
    number
  ][]) {
    const resized = await sharp(buffer)
      .resize({ width: Math.min(targetWidth, width || targetWidth), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    variantUrls[name] = await storage.put(`${keyPrefix}/${name}.webp`, resized, "image/webp");
  }

  return {
    originalUrl,
    thumbnailUrl: variantUrls.thumbnail,
    mediumUrl: variantUrls.medium,
    largeUrl: variantUrls.large,
    width,
    height,
    fileSize: buffer.length,
  };
}
