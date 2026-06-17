const USER_AGENT =
  "TruthCommissionTracker/0.1 (+https://github.com/rmarti55/TruthCommission)";

let lastFetchAt = 0;
const MIN_INTERVAL_MS = 1000;

export async function politeDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastFetchAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastFetchAt = Date.now();
}

export async function fetchText(url: string): Promise<{ url: string; text: string }> {
  await politeDelay();
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return { url: response.url, text: await response.text() };
}

export async function fetchHtml(url: string): Promise<{ url: string; html: string }> {
  const result = await fetchText(url);
  return { url: result.url, html: result.text };
}

export { USER_AGENT };
