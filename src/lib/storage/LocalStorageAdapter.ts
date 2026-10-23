import fs from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "./StorageAdapter";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/**
 * Stores files on local disk under /uploads, served by the server's static
 * file route at /files/*. Swappable for S3CompatibleStorageAdapter in
 * production via STORAGE_DRIVER=s3.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<string> {
    const fullPath = path.join(UPLOADS_ROOT, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return `/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(UPLOADS_ROOT, key);
    await fs.rm(fullPath, { force: true });
  }
}
