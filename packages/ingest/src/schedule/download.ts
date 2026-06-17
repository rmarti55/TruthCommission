import { createHash } from "node:crypto";

const USER_AGENT =
  "TruthCommissionTracker/0.1 (+https://github.com/rmarti55/TruthCommission)";

export type DownloadedPdf = {
  bytes: Buffer;
  contentHash: string;
  finalUrl: string;
  sourceUrl: string;
};

export async function downloadAgendaPdf(sourceUrl: string): Promise<DownloadedPdf> {
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${sourceUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  if (bytes.length < 100 || bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`Response from ${sourceUrl} is not a valid PDF`);
  }

  return {
    bytes,
    contentHash: createHash("sha256").update(bytes).digest("hex"),
    finalUrl: response.url,
    sourceUrl,
  };
}
