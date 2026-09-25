import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth-token";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    const matches = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !matches) {
      return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "This account is inactive." }, { status: 403 });
    }
    const token = await signSession({ sub: user.id, email: user.email });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
