import type { StorageAdapter } from "./StorageAdapter";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { S3CompatibleStorageAdapter } from "./S3CompatibleStorageAdapter";

function build(): StorageAdapter {
  if (process.env.STORAGE_DRIVER === "s3") {
    return new S3CompatibleStorageAdapter({
      endpoint: process.env.S3_ENDPOINT!,
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION ?? "auto",
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    });
  }
  return new LocalStorageAdapter();
}

export const storage: StorageAdapter = build();
export type { StorageAdapter } from "./StorageAdapter";

/** Recovers the storage key from a URL previously returned by storage.put(). */
export function keyFromUrl(url: string): string {
  return url.startsWith("/files/") ? url.slice("/files/".length) : url;
}
