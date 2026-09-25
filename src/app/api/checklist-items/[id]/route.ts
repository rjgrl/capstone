import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { checklistItemSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const body = checklistItemSchema.parse(await request.json());
    const item = await prisma.checklistItem.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description?.trim() || null,
        section: body.section?.trim() || null,
        isRequired: body.requiresFile ? body.isRequired : false,
        requiresFile: body.requiresFile,
        sequence: body.sequence,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const item = await prisma.checklistItem.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!item) throw new ApiError(404, "The documentary requirement could not be found.");
    if (item._count.documents) {
      throw new ApiError(409, "This documentary requirement already has submitted files and cannot be deleted.");
    }
    await prisma.checklistItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
