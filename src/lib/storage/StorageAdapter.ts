export interface StorageAdapter {
  /** Stores a buffer under `key` and returns a publicly reachable URL (or path). */
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
}
