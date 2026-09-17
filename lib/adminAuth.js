import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, sha256Hex, timingSafeEqual } from "./adminCrypto.js";

export async function verifyPassword(candidate) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !candidate) return false;
  return timingSafeEqual(candidate, password);
}

export async function createSession() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const token = await sha256Hex(password);
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function requireAdmin() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE_NAME)?.value;
  const expected = await sha256Hex(password);
  if (!value || !timingSafeEqual(value, expected)) {
    throw new Error("unauthorized");
  }
}
