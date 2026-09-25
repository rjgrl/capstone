import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    const notices = await prisma.emailNotice.findMany({
      where: isSuperAdmin(auth) ? undefined : { recipientUserId: auth.user.id },
      include: { project: { select: { id: true, title: true } }, recipient: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ notices });
  } catch (error) {
    return jsonError(error);
  }
}
