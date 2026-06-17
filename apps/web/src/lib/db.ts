import { createDb, type Database } from "@truth-commission/db";
import { env } from "./env";

let db: Database | undefined;

export function getDb(): Database | null {
  const url = env.postgresUrl();
  if (!url) return null;
  if (!db) db = createDb(url);
  return db;
}
