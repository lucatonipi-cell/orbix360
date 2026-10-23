import type { MultipartFile } from "./context";

/**
 * Minimal multipart/form-data parser (no external dependency). Handles the
 * standard case produced by browser FormData: boundary-delimited parts with
 * Content-Disposition (and optional Content-Type) headers followed by raw
 * bytes. Good enough for our image-upload endpoints; not a general MIME parser.
 */
export function parseMultipart(
  body: Buffer,
  contentType: string
): { fields: Record<string, string>; files: MultipartFile[] } {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  const boundary = boundaryMatch ? boundaryMatch[1] ?? boundaryMatch[2] : null;
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];
  if (!boundary) return { fields, files };

  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let start = body.indexOf(delimiter);
  while (start !== -1) {
    const next = body.indexOf(delimiter, start + delimiter.length);
    if (next === -1) break;
    let chunk = body.slice(start + delimiter.length, next);
    // strip leading CRLF and trailing CRLF
    if (chunk.slice(0, 2).toString() === "\r\n") chunk = chunk.slice(2);
    if (chunk.slice(-2).toString() === "\r\n") chunk = chunk.slice(0, -2);
    if (chunk.length > 0) parts.push(chunk);
    start = next;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd).toString("utf-8");
    const data = part.slice(headerEnd + 4);

    const nameMatch = headerText.match(/name="([^"]+)"/);
    const filenameMatch = headerText.match(/filename="([^"]*)"/);
    const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
    const fieldName = nameMatch?.[1] ?? "";

    if (filenameMatch) {
      files.push({
        fieldName,
        filename: filenameMatch[1],
        contentType: typeMatch?.[1]?.trim() ?? "application/octet-stream",
        data,
      });
    } else if (fieldName) {
      fields[fieldName] = data.toString("utf-8");
    }
  }

  return { fields, files };
}
