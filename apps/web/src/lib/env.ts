export function getEnv(name: string): string | undefined {
  return process.env[name];
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Vercel Cron sends this header in production
  const vercelCron = request.headers.get("x-vercel-cron");
  return vercelCron === "1" && Boolean(secret);
}

export const env = {
  postgresUrl: () => getEnv("POSTGRES_URL"),
  blobToken: () => getEnv("BLOB_READ_WRITE_TOKEN"),
  cronSecret: () => getEnv("CRON_SECRET"),
  appUrl: () => getEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
};
