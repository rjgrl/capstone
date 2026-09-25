import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { departmentSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePermission("departments.manage");
    const { id } = await context.params;
    const body = departmentSchema.parse(await request.json());
    const department = await prisma.department.update({
      where: { id },
      data: { name: body.name, code: body.code.toUpperCase() },
    });
    return NextResponse.json({ department });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("departments.manage");
    const { id } = await context.params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { programs: true, faculty: true, projects: true, users: true } } },
    });
    if (!department) throw new ApiError(404, "The department could not be found.");
    const counts = department._count;
    if (counts.programs || counts.faculty || counts.projects || counts.users) {
      throw new ApiError(
        409,
        "This department still has programs, faculty, users, or research projects. Move or remove those records first.",
      );
    }
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
