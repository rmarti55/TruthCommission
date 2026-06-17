import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "tc_admin_session";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET;
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return safeEqual(password, secret);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!session) return false;

  return safeEqual(session, secret);
}

export async function setAdminSession(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) return;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
