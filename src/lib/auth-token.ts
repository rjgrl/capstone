import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rdu_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionToken = {
  sub: string;
  email: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionToken) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (!payload.sub || typeof payload.email !== "string") {
    return null;
  }
  return { sub: payload.sub, email: payload.email };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
