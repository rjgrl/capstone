import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = passwordChangeSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "The current password is incorrect." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 12) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
