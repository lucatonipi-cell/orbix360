import { createHash, createHmac } from "node:crypto";
import https from "node:https";
import type { StorageAdapter } from "./StorageAdapter";

interface S3Config {
  endpoint: string; // e.g. https://<accountid>.r2.cloudflarestorage.com
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string; // CDN/public URL prefix, if different from endpoint
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/**
 * Minimal AWS Signature V4 client for S3-compatible object storage
 * (AWS S3, Cloudflare R2, Supabase Storage's S3 endpoint), implemented with
 * only Node's built-in `crypto`/`https` — no AWS SDK required. Activated via
 * STORAGE_DRIVER=s3 and the S3_* environment variables described in
 * ARCHITECTURE.md.
 */
export class S3CompatibleStorageAdapter implements StorageAdapter {
  constructor(private config: S3Config) {}

  private sign(method: string, key: string, contentType: string, body: Buffer) {
    const url = new URL(this.config.endpoint);
    const host = url.host;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);
    const canonicalUri = `/${this.config.bucket}/${key}`;

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      method,
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, this.config.region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = hmac(kSigning, stringToSign).toString("hex");

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      host,
      path: canonicalUri,
      headers: {
        "content-type": contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        authorization,
        "content-length": String(body.length),
      },
    };
  }

  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    const { host, path, headers } = this.sign("PUT", key, contentType, data);
    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        { host, path, method: "PUT", headers },
        (res) => {
          if ((res.statusCode ?? 500) >= 300) {
            reject(new Error(`S3 PUT failed: ${res.statusCode}`));
          } else {
            res.resume();
            resolve();
          }
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
    const base = this.config.publicBaseUrl ?? `${this.config.endpoint}/${this.config.bucket}`;
    return `${base}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const { host, path, headers } = this.sign("DELETE", key, "application/octet-stream", Buffer.alloc(0));
    await new Promise<void>((resolve, reject) => {
      const req = https.request({ host, path, method: "DELETE", headers }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", reject);
      req.end();
    });
  }
}
