import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { phaseSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const body = phaseSchema.parse(await request.json());
    const phase = await prisma.phase.update({
      where: { id },
      data: { name: body.name, description: body.description, sequence: body.sequence },
    });
    return NextResponse.json({ phase });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const phase = await prisma.phase.findUnique({
      where: { id },
      include: { _count: { select: { projects: true, documents: true, items: true } } },
    });
    if (!phase) throw new ApiError(404, "The phase could not be found.");
    if (phase._count.projects || phase._count.documents) {
      throw new ApiError(409, "This phase is already used by a Research Project and cannot be deleted.");
    }
    await prisma.phase.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
