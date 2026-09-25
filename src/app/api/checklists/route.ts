import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth, requirePermission } from "@/lib/api";
import { hasPermission } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    const allowed =
      hasPermission(auth, "checklists.manage") ||
      hasPermission(auth, "projects.view") ||
      hasPermission(auth, "projects.create") ||
      hasPermission(auth, "documents.review");
    if (!allowed) {
      return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
    }
    const checklists = await prisma.checklist.findMany({
      include: {
        phases: {
          orderBy: { sequence: "asc" },
          include: { items: { orderBy: { sequence: "asc" } }, _count: { select: { projects: true, documents: true } } },
        },
        _count: { select: { projects: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ checklists });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  await requirePermission("checklists.manage");
  return NextResponse.json(
    {
      error:
        "The system keeps the two documentary checklists named in the Research and Development Unit brief. Add phases and requirements to those checklists.",
    },
    { status: 405 },
  );
}
