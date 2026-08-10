import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "yomu_admin";
const MAX_AGE = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expires: Date.now() + MAX_AGE * 1000,
      nonce: randomBytes(8).toString("hex")
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId: string;
      expires: number;
    };
    return parsed.expires > Date.now() ? parsed.userId : null;
  } catch {
    return null;
  }
}

export async function currentAdminId() {
  return verifySessionToken((await cookies()).get(COOKIE)?.value);
}

export async function setAdminCookie(userId: string) {
  (await cookies()).set(COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function assertSameOrigin() {
  const values = await headers();
  const origin = values.get("origin");
  const host = values.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("Origen no permitido");
}

export async function requireAdminApi() {
  const id = await currentAdminId();
  if (!id) throw new Error("UNAUTHORIZED");
  await assertSameOrigin();
  return id;
}
