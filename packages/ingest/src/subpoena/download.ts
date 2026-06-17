import { createHash } from "node:crypto";

const USER_AGENT =
  "TruthCommissionTracker/0.1 (+https://github.com/rmarti55/TruthCommission)";

export type DownloadedPdf = {
  bytes: Buffer;
  contentHash: string;
  finalUrl: string;
  sourceUrl: string;
};

export async function downloadSubpoenaPdf(
  sourceUrl: string,
  cdnUrl?: string,
): Promise<DownloadedPdf> {
  const urls = [cdnUrl, sourceUrl].filter(Boolean) as string[];
  let lastError: Error | undefined;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);

      if (bytes.length < 100 || bytes.subarray(0, 4).toString() !== "%PDF") {
        throw new Error(`Response from ${url} is not a valid PDF`);
      }

      return {
        bytes,
        contentHash: createHash("sha256").update(bytes).digest("hex"),
        finalUrl: response.url,
        sourceUrl,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`Failed to download PDF from ${sourceUrl}`);
}
