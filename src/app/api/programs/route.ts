import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth, requirePermission } from "@/lib/api";
import { programSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const departmentId = new URL(request.url).searchParams.get("departmentId") || undefined;
    const canManage = hasPermission(auth, "programs.manage");
    const canUse =
      canManage ||
      hasPermission(auth, "faculty.manage") ||
      hasPermission(auth, "faculty.view") ||
      hasPermission(auth, "projects.create") ||
      hasPermission(auth, "projects.view");
    if (!canUse) {
      return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
    }
    const programs = await prisma.program.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: true, _count: { select: { faculty: true, projects: true } } },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    });
    return NextResponse.json({ programs });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("programs.manage");
    const body = programSchema.parse(await request.json());
    const program = await prisma.program.create({
      data: { name: body.name, departmentId: body.departmentId },
    });
    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
