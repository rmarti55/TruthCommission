import { put } from "@vercel/blob";
import { env } from "./env";

export async function storeBlob(
  pathname: string,
  body: Buffer | Blob | string,
  contentType: string,
) {
  const token = env.blobToken();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  return put(pathname, body, {
    access: "public",
    token,
    contentType,
  });
}

export function isBlobConfigured(): boolean {
  return Boolean(env.blobToken());
}
