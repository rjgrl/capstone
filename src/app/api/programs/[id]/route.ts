import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { programSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePermission("programs.manage");
    const { id } = await context.params;
    const body = programSchema.parse(await request.json());
    const program = await prisma.program.update({
      where: { id },
      data: { name: body.name, departmentId: body.departmentId },
    });
    return NextResponse.json({ program });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("programs.manage");
    const { id } = await context.params;
    const program = await prisma.program.findUnique({
      where: { id },
      include: { _count: { select: { faculty: true, projects: true } } },
    });
    if (!program) throw new ApiError(404, "The program could not be found.");
    if (program._count.faculty || program._count.projects) {
      throw new ApiError(
        409,
        "This program is still used by faculty or research projects. Move those records first.",
      );
    }
    await prisma.program.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
